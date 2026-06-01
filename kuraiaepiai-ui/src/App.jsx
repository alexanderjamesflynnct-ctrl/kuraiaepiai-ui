import React, { useState, useEffect } from "react";
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
} from "lucide-react";

// Specialized Components
import OwnershipForm from "./components/OwnershipForm";
import PackageTable from "./components/PackageTable";
import InfoModal from "./components/InfoModal";

const API_BASE = "http://localhost:8000";

const App = () => {
  const [tree, setTree] = useState([]);
  const [selectedApi, setSelectedApi] = useState(null); // { id, system, api, safeSystem, safeApi }
  const [view, setView] = useState("swagger");
  const [details, setDetails] = useState(null);
  const [modal, setModal] = useState({ open: false, type: "", data: null });

  // Initial load of the systems tree
  useEffect(() => {
    fetchTree();
  }, []);

  const fetchTree = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/tree`);
      setTree(res.data);
    } catch (err) {
      console.error("Failed to fetch tree from Collector:", err);
    }
  };

  const selectApi = async (id, system, api, safeSystem, safeApi) => {
    setSelectedApi({ id, system, api, safeSystem, safeApi });
    try {
      // Encode names for the URL fetch to handle Japanese/Spaces
      const encodedSystem = encodeURIComponent(system);
      const encodedApi = encodeURIComponent(api);

      const res = await axios.get(
        `${API_BASE}/api/details/${encodedSystem}/${encodedApi}`,
      );
      setDetails(res.data);
      setView("swagger");
    } catch (err) {
      console.error("Error fetching API details:", err);
    }
  };

  const removeApi = async (e, id, name) => {
    e.stopPropagation(); // Prevent selecting the item while trying to delete it
    if (
      !window.confirm(
        `Are you sure you want to delete the documentation for ${name}?`,
      )
    ) {
      return;
    }

    try {
      // Use the Numeric ID to bypass Japanese character encoding issues in the URL
      await axios.delete(`${API_BASE}/api/remove/${id}`);

      // If we deleted the one currently on screen, clear the view
      if (selectedApi?.id === id) {
        setSelectedApi(null);
        setDetails(null);
      }

      fetchTree(); // Refresh sidebar
    } catch (err) {
      alert("Failed to delete API. The Collector might be offline.");
      console.error(err);
    }
  };

  const handleOpenModal = (type) => {
    if (!details) return;
    const jsonKey = type === "ownership" ? "ownershipJson" : "packagesJson";
    const actualKey = Object.keys(details).find(
      (k) => k.toLowerCase() === jsonKey.toLowerCase(),
    );
    const rawData = details[actualKey];
    if (!rawData) return;

    const parsedData =
      typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    setModal({ open: true, type, data: parsedData });
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

  return (
    <div className="flex flex-col h-screen bg-white font-sans overflow-hidden text-slate-900">
      {/* HEADER: Kuriāēpīai Branding */}
      <header className="bg-k-purple px-6 py-3 flex justify-between items-center border-b border-purple-200 shadow-sm z-50">
        <div className="flex items-center gap-4">
          <div className="bg-white w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border border-purple-300">
            <span className="text-purple-600 font-bold text-2xl">ク</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-purple-900 leading-tight tracking-tight">
              クリアエーピーアイ
            </h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-purple-500 font-black">
              Kuriāēpīai
            </p>
          </div>
        </div>

        {selectedApi && (
          <div className="flex bg-white/50 rounded-lg p-1 border border-purple-300 shadow-inner">
            <button
              onClick={() => setView("swagger")}
              className={`px-6 py-1.5 rounded-md text-sm font-bold transition-all ${view === "swagger" ? "bg-purple-600 text-white shadow-md" : "text-purple-600 hover:bg-purple-100"}`}
            >
              Swagger
            </button>
            <button
              onClick={() => setView("codemap")}
              className={`px-6 py-1.5 rounded-md text-sm font-bold transition-all ${view === "codemap" ? "bg-purple-600 text-white shadow-md" : "text-purple-600 hover:bg-purple-100"}`}
            >
              CodeMap
            </button>
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR: System Tree */}
        <aside className="w-80 bg-slate-50 border-r border-slate-200 flex flex-col shadow-[inner_10px_0_15px_-3px_rgba(0,0,0,0.05)]">
          <div className="p-5 border-b bg-white flex items-center gap-3 font-black text-slate-400 uppercase tracking-widest text-[10px]">
            <Database size={14} /> Environment Assets
          </div>
          <nav className="flex-1 overflow-y-auto p-4">
            {tree.map((node) => (
              <div key={node.system} className="mb-6">
                <div className="flex items-center gap-2 font-bold text-slate-800 mb-2 px-2 text-sm uppercase tracking-wide">
                  <ChevronDown size={16} className="text-purple-500" />{" "}
                  {node.system}
                </div>
                <div className="ml-4 space-y-1 border-l-2 border-purple-100">
                  {node.apis.map((apiObj) => (
                    <div key={apiObj.id} className="pl-4 py-1 relative group">
                      <div className="flex justify-between items-center group">
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
                          className={`block w-full text-left font-bold text-sm transition-colors truncate pr-2 ${selectedApi?.id === apiObj.id ? "text-purple-600" : "text-slate-500 hover:text-purple-400"}`}
                        >
                          {apiObj.name}
                        </button>
                        <button
                          onClick={(e) => removeApi(e, apiObj.id, apiObj.name)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"
                          title="Delete API"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {selectedApi?.id === apiObj.id && (
                        <div className="mt-3 space-y-2 animate-in slide-in-from-top-1 duration-200">
                          <button
                            onClick={() => handleOpenModal("ownership")}
                            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-purple-500 transition-colors"
                          >
                            <Info size={14} /> Ownership
                          </button>
                          <button
                            onClick={() => handleOpenModal("packages")}
                            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-purple-500 transition-colors"
                          >
                            <Package size={14} /> Packages
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto relative bg-white">
          {!selectedApi ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 text-center p-10">
              <Activity size={80} className="mb-4 opacity-10" />
              <p className="font-bold tracking-widest uppercase text-xs">
                Select API to Initialize Documentation
              </p>
            </div>
          ) : view === "swagger" ? (
            <div className="swagger-wrapper animate-in fade-in duration-500">
              <SwaggerUI
                url={`${API_BASE}/docs/${selectedApi.safeSystem}/${selectedApi.safeApi}/swagger.json`}
                docExpansion="list"
                filter={true}
                tryItOutEnabled={true}
              />
            </div>
          ) : (
            /* CODEMAP VIEW */
            <div className="p-10 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Code size={28} className="text-purple-600" />
                </div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                  System CodeMap
                </h2>
              </div>

              {(() => {
                try {
                  const codeMapKey = Object.keys(details).find(
                    (k) => k.toLowerCase() === "codemapjson",
                  );
                  const codeMapData = JSON.parse(details[codeMapKey] || "[]");

                  if (codeMapData.length === 0)
                    return (
                      <div className="p-20 text-center border-2 border-dashed rounded-3xl text-slate-400 font-bold uppercase tracking-widest text-xs">
                        No SQL Logic Detected.
                      </div>
                    );

                  return (
                    <div className="border rounded-2xl overflow-hidden shadow-2xl border-slate-200">
                      <table className="w-full text-left">
                        <thead className="bg-slate-800 text-white font-bold uppercase text-[10px] tracking-[0.2em]">
                          <tr>
                            <th className="p-4">Controller</th>
                            <th className="p-4">Web Method</th>
                            <th className="p-4 text-center">REST</th>
                            <th className="p-4">SQL Action</th>
                            <th className="p-4 text-purple-300">
                              Target Tables
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {codeMapData.map((m, i) => {
                            const ctrl =
                              m.Controller || m.controller || "Default";
                            const name = m.MethodName || m.methodName;
                            const verb = m.Verb || m.verb || "GET";
                            const sqlTypes = m.SqlType || m.sqlType || [];
                            const tables =
                              m.TargetTables || m.targetTables || [];

                            const colors = {
                              GET: "bg-blue-100 text-blue-700",
                              POST: "bg-green-100 text-green-700",
                              PATCH: "bg-orange-100 text-orange-700",
                              DELETE: "bg-red-100 text-red-700",
                              PUT: "bg-purple-100 text-purple-700",
                            };

                            return (
                              <tr
                                key={i}
                                className="hover:bg-purple-50 cursor-pointer transition-all group"
                                onClick={() => handleCodemapClick(name)}
                              >
                                <td className="p-4 text-slate-400 font-bold text-[10px] uppercase tracking-tighter">
                                  {ctrl}
                                </td>
                                <td className="p-4 font-black text-purple-600 font-mono text-sm tracking-tight">
                                  {name}
                                </td>
                                <td className="p-4 text-center">
                                  <span
                                    className={`px-2 py-1 rounded text-[10px] font-black ${colors[verb] || "bg-slate-100 text-slate-600"}`}
                                  >
                                    {verb}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <div className="flex flex-wrap gap-1">
                                    {sqlTypes.map((t) => (
                                      <span
                                        key={t}
                                        className="bg-slate-800 text-white px-2 py-0.5 rounded text-[9px] font-bold"
                                      >
                                        {t}
                                      </span>
                                    ))}
                                    {sqlTypes.length === 0 && (
                                      <span className="text-slate-300 text-[10px] font-bold uppercase">
                                        Logic
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-4 text-sm font-bold text-slate-500 italic font-mono">
                                  {tables.length > 0 ? (
                                    tables.join(", ")
                                  ) : (
                                    <span className="opacity-30">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                } catch (err) {
                  return (
                    <div className="p-10 bg-red-50 text-red-600 font-bold rounded-2xl">
                      Error parsing data.
                    </div>
                  );
                }
              })()}
            </div>
          )}
        </main>
      </div>

      <InfoModal
        isOpen={modal.open}
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
