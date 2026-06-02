import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import {
  ChevronDown,
  Database,
  Code,
  Activity,
  Info,
  Package,
  Trash2,
  Settings,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Loader2,
  Server,
  RefreshCw,
  HeartPulse,
  ShieldAlert,
} from "lucide-react";

// Specialized Components
import OwnershipForm from "./components/OwnershipForm";
import PackageTable from "./components/PackageTable";
import InfoModal from "./components/InfoModal";

const API_BASE = "http://localhost:8000";
const ALL_TIMEZONES = Intl.supportedValuesOf("timeZone");

const App = () => {
  const [tree, setTree] = useState([]);
  const [selectedApi, setSelectedApi] = useState(null);
  const [view, setView] = useState("swagger");
  const [details, setDetails] = useState(null);
  const [apiSettings, setApiSettings] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [modal, setModal] = useState({ open: false, type: "", data: null });
  const [loading, setLoading] = useState(false);
  const [isPinging, setIsPinging] = useState(false);

  // Tracking for auto-selection logic
  const lastAutoSelectedRef = useRef(null);

  useEffect(() => {
    fetchTree();
    const interval = setInterval(fetchTree, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchTree = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/tree`);
      const rawTree = res.data;
      setTree(rawTree);

      const failedApis = rawTree
        .flatMap((n) => n.apis)
        .filter((a) => !a.isHealthy)
        .sort((a, b) => new Date(a.stateStarted) - new Date(b.stateStarted));

      if (failedApis.length > 0) {
        const primaryFailure = failedApis[0];
        if (lastAutoSelectedRef.current !== primaryFailure.id) {
          lastAutoSelectedRef.current = primaryFailure.id;
          const sysNode = rawTree.find((n) =>
            n.apis.some((a) => a.id === primaryFailure.id),
          );
          selectApi(
            primaryFailure.id,
            sysNode.system,
            primaryFailure.name,
            primaryFailure.safeSystem,
            primaryFailure.safeApi,
            true,
          );
        }
      } else {
        lastAutoSelectedRef.current = null;
      }
    } catch (err) {
      console.error("Sidebar fetch failed", err);
    }
  };

  const selectApi = async (
    id,
    system,
    api,
    safeSystem,
    safeApi,
    isAuto = false,
  ) => {
    if (!isAuto) setLoading(true);
    setDetails(null);
    setApiSettings(null);
    setSelectedApi({ id, system, api, safeSystem, safeApi });

    try {
      const [detRes, setRes, healthRes] = await Promise.all([
        axios.get(
          `${API_BASE}/api/details/${encodeURIComponent(system)}/${encodeURIComponent(api)}`,
        ),
        axios.get(`${API_BASE}/api/settings/${id}`),
        axios.get(`${API_BASE}/api/health/history/${id}`),
      ]);

      setDetails(detRes.data);
      setApiSettings(setRes.data);
      setHealthData(healthRes.data);

      if (isAuto) setView("healthlog");
      else setView("swagger");
    } catch (err) {
      console.error("Data Fetch Failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const removeApi = async (e, id, name) => {
    e.stopPropagation();
    if (!window.confirm(`Delete all documentation and history for ${name}?`))
      return;
    try {
      await axios.delete(`${API_BASE}/api/remove/${id}`);
      if (selectedApi?.id === id) {
        setSelectedApi(null);
        setDetails(null);
      }
      fetchTree();
    } catch (err) {
      alert("Delete failed.");
    }
  };

  const manualPing = async () => {
    if (!selectedApi) return;
    setIsPinging(true);
    try {
      await axios.post(`${API_BASE}/api/health/ping/${selectedApi.id}`);
      const res = await axios.get(
        `${API_BASE}/api/health/history/${selectedApi.id}`,
      );
      setHealthData(res.data);
      fetchTree();
    } catch (err) {
      alert("Ping failed");
    } finally {
      setIsPinging(false);
    }
  };

  const updateGlobalTimezone = async (newTz) => {
    setApiSettings({ ...apiSettings, TimeZone: newTz });
    if (window.confirm(`Apply the timezone "${newTz}" to ALL managed APIs?`)) {
      try {
        await axios.patch(`${API_BASE}/api/settings/global/timezone`, {
          timezone: newTz,
        });
        fetchTree();
      } catch (err) {
        alert("Global update failed");
      }
    }
  };

  const formatInTimeZone = (utcString, timeZone = "UTC") => {
    if (!utcString) return "N/A";
    try {
      const date = new Date(
        utcString.endsWith("Z") ? utcString : utcString + "Z",
      );
      return new Intl.DateTimeFormat("en-US", {
        timeZone: timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(date);
    } catch (e) {
      return utcString;
    }
  };

  const getParsedJson = (fieldName) => {
    if (!details) return null;
    const target = (fieldName + "json").toLowerCase();
    const actualKey = Object.keys(details).find(
      (k) => k.toLowerCase() === target,
    );
    const rawValue = details[actualKey];
    try {
      return typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;
    } catch (e) {
      return null;
    }
  };

  const handleCodemapClick = (methodName) => {
    setView("swagger");
    setTimeout(() => {
      const element = document.getElementById(
        `operations-default-${methodName}`,
      );
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
        element.classList.add("bg-yellow-100");
        setTimeout(() => element.classList.remove("bg-yellow-100"), 2000);
      }
    }, 500);
  };

  const failedApisList = tree
    .flatMap((n) => n.apis.filter((a) => !a.isHealthy))
    .sort((a, b) => new Date(a.stateStarted) - new Date(b.stateStarted));

  return (
    <div className="flex flex-col h-screen bg-white font-sans overflow-hidden text-slate-900">
      {/* HEADER */}
      <header className="bg-k-purple px-6 py-3 flex justify-between items-center border-b border-purple-200 shadow-sm z-50">
        <div className="flex items-center gap-4">
          <div className="bg-white w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border border-purple-300 font-bold text-purple-600 text-2xl">
            ク
          </div>
          <div>
            <h1 className="text-xl font-black text-purple-900 leading-tight">
              クリアエーピーアイ
            </h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-purple-500 font-black">
              Kuriāēpīai
            </p>
          </div>
        </div>

        {selectedApi && (
          <div className="flex bg-white/50 rounded-lg p-1 border border-purple-300 shadow-inner">
            {[
              { id: "swagger", label: "Swagger", icon: <Server size={14} /> },
              { id: "codemap", label: "CodeMap", icon: <Code size={14} /> },
              { id: "ownership", label: "Ownership", icon: <Info size={14} /> },
              {
                id: "packages",
                label: "Packages",
                icon: <Package size={14} />,
              },
              {
                id: "healthlog",
                label: "HealthLog",
                icon: <HeartPulse size={14} />,
              },
              {
                id: "settings",
                label: "Settings",
                icon: <Settings size={14} />,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={`px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${view === tab.id ? "bg-purple-600 text-white shadow-md" : "text-purple-600 hover:bg-purple-100"}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-80 bg-slate-50 border-r border-slate-200 flex flex-col">
          <div className="p-5 border-b bg-white flex items-center gap-3 font-black text-slate-400 uppercase tracking-widest text-[10px]">
            <Database size={14} /> Environment Assets
          </div>
          <nav className="flex-1 overflow-y-auto p-4">
            {/* INCIDENTS SECTION */}
            {failedApisList.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 font-black text-red-600 mb-3 px-2 text-[10px] uppercase tracking-tighter animate-pulse">
                  <ShieldAlert size={14} /> Active Incidents (
                  {failedApisList.length})
                </div>
                <div className="space-y-2">
                  {failedApisList.map((apiObj) => (
                    <div
                      key={`fail-${apiObj.id}`}
                      className="mx-2 p-2 rounded-lg border-2 border-red-500 bg-red-50 shadow-md flex items-center group"
                    >
                      {/* RESTORED HOVER TITLE HERE */}
                      <div
                        className="w-3 h-3 rounded-full mr-3 bg-red-600 shadow-red-200 shadow-md cursor-help"
                        title={`Last Check: ${formatInTimeZone(apiObj.lastCheck, "UTC")}`}
                      />
                      <button
                        onClick={() => {
                          const sys = tree.find((n) =>
                            n.apis.some((a) => a.id === apiObj.id),
                          ).system;
                          selectApi(
                            apiObj.id,
                            sys,
                            apiObj.name,
                            apiObj.safeSystem,
                            apiObj.safeApi,
                          );
                          setView("healthlog");
                        }}
                        className="block w-full text-left font-black text-sm text-red-700 truncate flex-1"
                      >
                        {apiObj.name}
                      </button>
                      <button
                        onClick={(e) => removeApi(e, apiObj.id, apiObj.name)}
                        className="p-1 text-red-300 hover:text-red-700 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SYSTEM TREE */}
            {tree.map((node) => (
              <div key={node.system} className="mb-6">
                <div className="flex items-center gap-2 font-bold text-slate-800 mb-2 px-2 text-xs uppercase tracking-wider">
                  <ChevronDown size={14} className="text-purple-500" />{" "}
                  {node.system}
                </div>
                <div className="ml-4 space-y-2 border-l-2 border-purple-100">
                  {node.apis.map((apiObj) => (
                    <div
                      key={apiObj.id}
                      className={`mx-2 p-2 rounded-xl transition-all border-2 flex items-center group ${selectedApi?.id === apiObj.id ? "border-purple-400 bg-purple-50/50 shadow-sm" : "border-transparent"}`}
                    >
                      {/* RESTORED HOVER TITLE HERE */}
                      <div
                        onClick={(e) => {
                          selectApi(
                            apiObj.id,
                            node.system,
                            apiObj.name,
                            apiObj.safeSystem,
                            apiObj.safeApi,
                          );
                          setView("healthlog");
                        }}
                        className={`w-3 h-3 rounded-full mr-3 cursor-pointer shadow-sm transition-transform hover:scale-125 ${apiObj.isHealthy ? "bg-green-500 shadow-green-200" : "bg-red-500 animate-pulse shadow-red-200"}`}
                        title={`Last Check: ${formatInTimeZone(apiObj.lastCheck, "UTC")}`}
                      />
                      <button
                        onClick={() =>
                          selectApi(
                            apiObj.id,
                            node.system,
                            apiObj.name,
                            apiObj.safeSystem,
                            apiObj.safeApi,
                          )
                        }
                        className={`block w-full text-left font-bold text-sm transition-colors truncate flex-1 ${selectedApi?.id === apiObj.id ? "text-purple-700" : "text-slate-500 hover:text-purple-400"}`}
                      >
                        {apiObj.name}
                      </button>
                      <button
                        onClick={(e) => removeApi(e, apiObj.id, apiObj.name)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* MAIN AREA */}
        <main className="flex-1 overflow-y-auto relative bg-white">
          {!selectedApi ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-40">
              <Activity size={80} className="mb-4" />
              <p className="font-bold tracking-widest uppercase text-xs text-center px-20">
                Select an environment asset to initialize monitoring
              </p>
            </div>
          ) : loading ? (
            <div className="h-full flex flex-col items-center justify-center text-purple-400">
              <Loader2 size={40} className="animate-spin" />
              <p className="mt-4 font-bold uppercase text-[10px] tracking-widest">
                Accessing Registry Engine...
              </p>
            </div>
          ) : (
            <div className="h-full">
              {view === "swagger" && (
                <SwaggerUI
                  url={`${API_BASE}/docs/${selectedApi.safeSystem}/${selectedApi.safeApi}/swagger.json`}
                  docExpansion="list"
                  filter={true}
                  tryItOutEnabled={true}
                />
              )}

              {view === "codemap" && (
                <div className="p-10 max-w-6xl mx-auto animate-in fade-in">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <Code size={28} className="text-purple-600" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                      System CodeMap
                    </h2>
                  </div>
                  <div className="border rounded-2xl overflow-hidden shadow-xl border-slate-200">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-800 text-white font-bold uppercase text-[10px] tracking-widest">
                        <tr>
                          <th className="p-4">Controller</th>
                          <th className="p-4">Web Method</th>
                          <th className="p-4 text-center">REST</th>
                          <th className="p-4">SQL Action</th>
                          <th className="p-4">Target Tables</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {getParsedJson("codemap")?.map((m, i) => (
                          <tr
                            key={i}
                            className="hover:bg-purple-50 cursor-pointer transition-all"
                            onClick={() =>
                              handleCodemapClick(m.MethodName || m.methodName)
                            }
                          >
                            <td className="p-4 text-slate-400 font-bold text-[10px] uppercase tracking-tighter">
                              {m.Controller || m.controller}
                            </td>
                            <td className="p-4 font-black text-purple-600 font-mono">
                              {m.MethodName || m.methodName}
                            </td>
                            <td className="p-4 text-center">
                              <span className="bg-slate-100 px-2 py-1 rounded text-[10px] font-black">
                                {m.Verb || m.verb || "GET"}
                              </span>
                            </td>
                            <td className="p-4 flex flex-wrap gap-1">
                              {(m.SqlType || m.sqlType || []).map((s) => (
                                <span
                                  key={s}
                                  className="bg-slate-800 text-white px-2 py-0.5 rounded text-[8px] font-bold uppercase"
                                >
                                  {s}
                                </span>
                              ))}
                            </td>
                            <td className="p-4 text-xs font-bold text-slate-500 italic font-mono">
                              {(m.TargetTables || m.targetTables || []).join(
                                ", ",
                              ) || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {view === "healthlog" && (
                <div className="p-10 max-w-6xl mx-auto animate-in fade-in">
                  <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 p-2 rounded-lg">
                        <HeartPulse size={28} className="text-green-600" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                          Availability Logs
                        </h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Real-time Heartbeat Monitoring
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="bg-slate-50 border p-3 px-5 rounded-2xl text-right shadow-sm">
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">
                          Current Uptime
                        </label>
                        <div className="text-sm font-black text-green-600 flex items-center justify-end gap-2">
                          <ShieldCheck size={14} />{" "}
                          {healthData?.uptimeLabel || "Calculating..."}
                        </div>
                      </div>
                      <div className="bg-slate-50 border p-3 px-5 rounded-2xl text-right shadow-sm">
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">
                          Last Downtime
                        </label>
                        <div className="text-sm font-black text-amber-600 flex items-center justify-end gap-2">
                          <Clock size={14} />{" "}
                          {healthData?.lastIncidentLabel || "None"}
                          {healthData?.lastIncidentEnd && (
                            <span className="text-[10px] text-slate-400 ml-1">
                              (
                              {formatInTimeZone(
                                healthData.lastIncidentEnd,
                                apiSettings?.TimeZone,
                              )}
                              )
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={manualPing}
                        disabled={isPinging}
                        className="bg-slate-800 text-white px-6 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isPinging ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <RefreshCw size={16} />
                        )}{" "}
                        Ping Service
                      </button>
                    </div>
                  </div>
                  <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                        <tr>
                          <th className="p-4">
                            Timestamp ({apiSettings?.TimeZone || "UTC"})
                          </th>
                          <th className="p-4 text-center">Status</th>
                          <th className="p-4 text-center">Latency</th>
                          <th className="p-4">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {healthData?.logs.map((l, i) => (
                          <tr
                            key={i}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="p-4 font-mono text-xs text-slate-600">
                              {formatInTimeZone(
                                l.Timestamp,
                                apiSettings?.TimeZone || "UTC",
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <span
                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${l.Status === "Healthy" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                              >
                                {l.Status}
                              </span>
                            </td>
                            <td className="p-4 text-center text-slate-400 font-mono text-xs">
                              {l.ResponseTimeMs}ms
                            </td>
                            <td className="p-4 text-slate-500 text-xs italic truncate max-w-xs">
                              {l.Details || "OK"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {view === "settings" && apiSettings && (
                <div className="p-10 max-w-2xl mx-auto animate-in fade-in">
                  <div className="flex items-center gap-3 mb-8">
                    <Settings size={32} className="text-purple-600" />
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                      API Governance
                    </h2>
                  </div>
                  <div className="space-y-8 bg-slate-50 p-8 rounded-3xl border border-slate-200 shadow-inner">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                        Ping Interval (Minutes)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={apiSettings.PingIntervalMinutes || 5}
                        onChange={(e) =>
                          setApiSettings({
                            ...apiSettings,
                            PingIntervalMinutes: parseInt(e.target.value),
                          })
                        }
                        className="w-full p-3 rounded-xl border border-slate-300 font-bold shadow-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                        Display Timezone
                      </label>
                      <select
                        value={apiSettings.TimeZone || "UTC"}
                        onChange={(e) => updateGlobalTimezone(e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-300 font-bold bg-white shadow-sm outline-none"
                      >
                        {ALL_TIMEZONES.map((tz) => (
                          <option key={tz} value={tz}>
                            {tz}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                        Health Log Retention (Days)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={apiSettings.LogRetentionDays || 30}
                        onChange={(e) =>
                          setApiSettings({
                            ...apiSettings,
                            LogRetentionDays: parseInt(e.target.value),
                          })
                        }
                        className="w-full p-3 rounded-xl border border-slate-300 font-bold shadow-sm outline-none"
                      />
                    </div>
                    <button
                      onClick={async () => {
                        await axios.patch(
                          `${API_BASE}/api/settings/${selectedApi.id}`,
                          apiSettings,
                        );
                        alert("Policy Updated");
                      }}
                      className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-purple-700 transition-all active:scale-95"
                    >
                      Update Governance Policy
                    </button>
                  </div>
                </div>
              )}

              {view === "ownership" && (
                <div className="p-10 max-w-4xl mx-auto">
                  <h2 className="text-3xl font-black mb-8 border-b pb-4">
                    Ownership Metadata
                  </h2>
                  <OwnershipForm data={getParsedJson("ownership")} />
                </div>
              )}
              {view === "packages" && (
                <div className="p-10 max-w-4xl mx-auto">
                  <h2 className="text-3xl font-black mb-8 border-b pb-4">
                    Software Bill of Materials
                  </h2>
                  <PackageTable data={getParsedJson("packages")} />
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <InfoModal
        isOpen={modal.open && modal.type !== "health"}
        onClose={() => setModal({ ...modal, open: false })}
        type={modal.type}
      >
        {modal.type === "ownership" ? (
          <OwnershipForm data={modal.data} />
        ) : (
          <PackageTable data={modal.data} />
        )}
      </InfoModal>
    </div>
  );
};

export default App;
