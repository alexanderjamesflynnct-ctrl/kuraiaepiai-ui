This instruction sheet provides the steps to onboard a new C# API into the **Kuriāēpīai (クリアエーピーアイ)** ecosystem.

---

# 📋 Kuriāēpīai Onboarding Guide

Follow these steps to enable centralized documentation, ownership tracking, and SQL mapping for any existing C# API.

## Prerequisites

- The API must be running **ASP.NET Core (6.0, 7.0, 8.0, or 10.0)**.
- **Swashbuckle (Swagger)** must be installed and configured in the project.
- The **Kuraiaepiai.Collector** (Central API) must be running on `http://localhost:8000`.

---

## Step 1: Create the Configuration File

In the **root directory** of your Source API (where the `.csproj` file is located), create a file named `kuraiaepiai.config.json`.

```json
{
  "BusinessOwner": "Department Manager Name",
  "BusinessDept": "Marketing / Finance / Engineering",
  "ITOwner": "Lead Developer Name",
  "ITDept": "Infrastructure / Software",
  "SystemName": "GeneralSystemName",
  "APIName": "SpecificAPIName"
}
```

_Note: `SystemName` and `APIName` combined create a unique identity in the dashboard._

---

## Step 2: Add the Reporter Engine

Create a new file named `KuraiaepiaiReporter.cs` anywhere in your Source API project (usually in a `Helpers` or `Infrastructure` folder) and paste the code below:

<details>
<summary>Click to expand KuraiaepiaiReporter.cs Code</summary>

```csharp
using System.Reflection;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace kuraiaepiai.Source;

public class KuraiaepiaiReporter
{
    public async Task<object> GenerateReport(string projectPath, string swaggerJsonUrl)
    {
        var configPath = Path.Combine(projectPath, "kuraiaepiai.config.json");
        if (!File.Exists(configPath)) return new { Error = "Missing kuraiaepiai.config.json" };
        var config = JsonSerializer.Deserialize<ProjectConfig>(File.ReadAllText(configPath));

        var allFiles = Directory.GetFiles(projectPath, "*.cs", SearchOption.AllDirectories)
            .Where(f => !f.Contains("\\bin\\") && !f.Contains("\\obj\\")).ToList();

        var ownership = new {
            config.BusinessOwner, config.BusinessDept, config.ITOwner, config.ITDept, config.SystemName, config.APIName,
            TotalLinesOfCode = allFiles.Sum(f => File.ReadAllLines(f).Length),
            TotalFiles = allFiles.Count,
            TotalControllers = allFiles.Count(f => f.EndsWith("Controller.cs"))
        };

        var packages = Assembly.GetEntryAssembly()?.GetReferencedAssemblies()
            .Select(a => new { Name = a.Name, Version = a.Version?.ToString(), IsLatest = true, Supported = "Supported" }).ToList();

        var codeMap = new List<object>();
        var controllerFiles = allFiles.Where(f => f.EndsWith("Controller.cs"));

        foreach (var file in controllerFiles)
        {
            var content = File.ReadAllText(file);
            var httpMatches = Regex.Matches(content, @"\[(Http(Get|Post|Put|Delete|Patch|Head))");

            foreach (Match m in httpMatches)
            {
                var verb = m.Groups[2].Value.ToUpper();
                var searchArea = content.Substring(m.Index, Math.Min(300, content.Length - m.Index));
                var methodMatch = Regex.Match(searchArea, @"public\s+(?:async\s+)?(?:Task<|ActionResult<)?[\w\.]+(?:<[\w\.]+>)?\s+(\w+)\s*\(");

                if (methodMatch.Success)
                {
                    string methodName = methodMatch.Groups[1].Value;
                    int bodyStart = content.IndexOf('{', m.Index + methodMatch.Index);
                    if (bodyStart == -1) continue;
                    string body = ExtractMethodBody(content, bodyStart);

                    var sqlKeywords = new[] { "SELECT", "INSERT", "UPDATE", "DELETE" };
                    var detectedTypes = sqlKeywords.Where(k => body.Contains(k, StringComparison.OrdinalIgnoreCase)).ToList();

                    var tableMatches = Regex.Matches(body, @"(?i)(?:FROM|JOIN|UPDATE|INTO)\s+([\[\]\w\.]+)");
                    var tables = tableMatches.Select(t => t.Groups[1].Value.Trim('[', ']', ' ', '"'))
                        .Where(t => !string.IsNullOrEmpty(t) && !sqlKeywords.Contains(t.ToUpper()) && t.ToUpper() != "VALUES")
                        .Distinct().ToList();

                    codeMap.Add(new { MethodName = methodName, Verb = verb, SqlType = detectedTypes, TargetTables = tables });
                }
            }
        }

        object patchedSwagger = new { };
        try {
            using var client = new HttpClient();
            var swaggerRaw = await client.GetStringAsync(swaggerJsonUrl);
            var uri = new Uri(swaggerJsonUrl);
            var swaggerDict = JsonSerializer.Deserialize<Dictionary<string, object>>(swaggerRaw);
            swaggerDict["servers"] = new[] { new { url = $"{uri.Scheme}://{uri.Authority}" } };
            patchedSwagger = swaggerDict;
        } catch { }

        return new { ownership, packages, codeMap, swagger = patchedSwagger };
    }

    private string ExtractMethodBody(string content, int startChar)
    {
        int braceCount = 0;
        for (int i = startChar; i < content.Length; i++)
        {
            if (content[i] == '{') braceCount++;
            else if (content[i] == '}') braceCount--;
            if (braceCount == 0) return content.Substring(startChar, i - startChar + 1);
        }
        return "";
    }
}

public class ProjectConfig {
    public string BusinessOwner { get; set; } = "";
    public string BusinessDept { get; set; } = "";
    public string ITOwner { get; set; } = "";
    public string ITDept { get; set; } = "";
    public string SystemName { get; set; } = "";
    public string APIName { get; set; } = "";
}
```

</details>

---

## Step 3: Register the Sync Endpoint

In your Source API’s `Program.cs`, perform the following three modifications:

### A. Add the Using Statement (Top of file)

```csharp
using kuraiaepiai.Source;
```

### B. Configure CORS (Before `builder.Build()`)

This allows the Kuriāēpīai UI to use the "Try It Now" feature.

```csharp
builder.Services.AddCors(options => {
    options.AddPolicy("KuraiaepiaiDevPolicy", policy => {
        policy.WithOrigins("http://localhost:5173") // Vite UI Port
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});
```

### C. Map the Sync Route (After `app.MapControllers()`)

```csharp
if (app.Environment.IsDevelopment())
{
    app.UseCors("KuraiaepiaiDevPolicy");

    app.MapGet("/clearapi/push", async (HttpContext context) =>
    {
        var reporter = new KuraiaepiaiReporter();
        var host = context.Request.Host.Value;
        var swaggerUrl = $"http://{host}/swagger/v1/swagger.json";

        var report = await reporter.GenerateReport(Directory.GetCurrentDirectory(), swaggerUrl);

        using var client = new HttpClient();
        var response = await client.PostAsJsonAsync("http://localhost:8000/api/collect", report);

        return response.IsSuccessStatusCode
            ? Results.Ok("クリアエーピーアイ (Kuriāēpīai): Documentation Synced successfully!")
            : Results.BadRequest("Sync failed. Ensure Central ClearAPI Collector is running.");
    });
}
```

---

## Step 4: Synchronize

1.  **Start** the Central Collector API (Port 8000).
2.  **Start** your Source API.
3.  Open your browser and go to: `http://localhost:[Your_API_Port]/clearapi/push`.
4.  You should see the success message.

---

## Step 5: Verify in the UI

1.  Open the **Kuriāēpīai React UI**.
2.  Your new `SystemName` should appear in the left-hand sidebar.
3.  Expand it to see your `APIName`.
4.  Click **CodeMap** to verify that your Web Methods and SQL Tables have been mapped.
5.  Open **Swagger** and use **Try It Out** to verify communication back to your API.

---

## Troubleshooting

- **White Screen in UI:** Check the Browser Console (F12). Usually caused by a missing dependency in the Source API that results in empty JSON.
- **SQL Not Showing:** Ensure your SQL strings use standard keywords (SELECT/FROM/UPDATE/INSERT) and that the method is marked with an `[Http...]` attribute.
- **Swagger Link Incorrect:** Ensure your Source API is fully started before hitting the `/push` endpoint so the Reporter can download the JSON.
