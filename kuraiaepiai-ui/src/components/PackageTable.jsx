const PackageTable = ({ data }) => {
  if (!data || !Array.isArray(data)) return <p>No package data found.</p>;

  return (
    <div className="relative border rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-y-auto max-h-[60vh]">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-purple-600 text-white shadow-md z-20">
            <tr>
              <th className="p-4 text-sm font-bold uppercase tracking-wider">
                Dependency Name
              </th>
              <th className="p-4 text-sm font-bold uppercase tracking-wider">
                Version
              </th>
              <th className="p-4 text-sm font-bold uppercase tracking-wider text-center">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((pkg, i) => {
              const name = pkg.Name || pkg.name;
              const version = pkg.Version || pkg.version;
              const isLatest = pkg.IsLatest ?? pkg.isLatest;

              return (
                <tr key={i} className="hover:bg-purple-50 transition-colors">
                  <td className="p-4 font-medium text-gray-700">{name}</td>
                  <td className="p-4 font-mono text-sm text-gray-500">
                    {version}
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                        isLatest
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {isLatest ? "Latest" : "Update Available"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PackageTable;
