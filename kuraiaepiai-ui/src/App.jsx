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
} from "lucide-react";
import OwnershipForm from "./components/OwnershipForm";
import PackageTable from "./components/PackageTable";
import InfoModal from "./components/InfoModal";

const API_BASE = "http://localhost:8000";

const App = () => {
  const [tree, setTree] = useState([]);
  const [selectedApi, setSelectedApi] = useState(null);
  const [view, setView] = useState("swagger");
  const [details, setDetails] = useState(null);
  const [modal, setModal] = useState({ open: false, type: "", data: null });

  useEffect(() => {
    fetchTree();
  }, []);
  const fetchTree = async () => {
    const res = await axios.get(`${API_BASE}/api/tree`);
    setTree(res.data);
  };

  const selectApi = async (system, api) => {
    setSelectedApi({ system, api });
    const res = await axios.get(`${API_BASE}/api/details/${system}/${api}`);
    setDetails(res.data);
    setView("swagger");
  };

  const handleOpenModal = (type) => {
    if (!details) return;
    const jsonKey = type === "ownership" ? "ownershipJson" : "packagesJson";
    const actualKey = Object.keys(details).find(
      (k) => k.toLowerCase() === jsonKey.toLowerCase(),
    );
    const parsedData = JSON.parse(details[actualKey] || "{}");
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
    <div className="flex flex-col h-screen bg-white font-sans overflow-hidden">
      <header className="bg-k-purple px-6 py-3 flex justify-between items-center border-b border-purple-200 shadow-sm z-50">
        <div className="flex items-center gap-4">
          <div className="bg-white w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border border-purple-300">
            <span className="text-purple-600 font-bold text-2xl">ク</span>
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
          <div className="flex bg-white/50 rounded-lg p-1 border border-purple-300">
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
        <aside className="w-80 bg-slate-50 border-r border-slate-200 flex flex-col">
          <div className="p-5 border-b bg-white flex items-center gap-3 font-black text-slate-400 uppercase tracking-widest text-xs">
            <Database size={16} /> Environment Assets
          </div>
          <nav className="flex-1 overflow-y-auto p-4">
            {tree.map((node) => (
              <div key={node.system} className="mb-6">
                <div className="flex items-center gap-2 font-bold text-slate-800 mb-2 px-2">
                  <ChevronDown size={18} className="text-purple-500" />{" "}
                  {node.system}
                </div>
                <div className="ml-4 space-y-1 border-l-2 border-purple-100">
                  {node.apis.map((api) => (
                    <div key={api} className="pl-4 py-1">
                      <button
                        onClick={() => selectApi(node.system, api)}
                        className={`block w-full text-left font-bold text-sm transition-colors ${selectedApi?.api === api ? "text-purple-600" : "text-slate-500 hover:text-purple-400"}`}
                      >
                        {api}
                      </button>
                      {selectedApi?.api === api && (
                        <div className="mt-2 space-y-2">
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

        <main className="flex-1 overflow-y-auto relative bg-white">
          {!selectedApi ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
              <Activity size={80} className="mb-4 opacity-10" />
              <p className="font-bold tracking-widest uppercase text-sm text-center">
                Select System API to initialize
              </p>
            </div>
          ) : view === "swagger" ? (
            <SwaggerUI
              url={`${API_BASE}/docs/${selectedApi.system}/${selectedApi.api}/swagger.json`}
              docExpansion="list"
            />
          ) : (
            <div className="p-10 max-w-6xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <Code size={32} className="text-purple-600" />
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                  Logic & SQL Flow
                </h2>
              </div>

              {(() => {
                try {
                  const key = Object.keys(details).find(
                    (k) => k.toLowerCase() === "codemapjson",
                  );
                  const codeMapData = JSON.parse(details[key] || "[]");
                  if (codeMapData.length === 0)
                    return (
                      <div className="p-20 text-center border-2 border-dashed rounded-2xl text-slate-400">
                        No SQL Mapping Found.
                      </div>
                    );

                  return (
                    <div className="border rounded-2xl overflow-hidden shadow-xl border-slate-200">
                      <table className="w-full text-left">
                        <thead className="bg-slate-800 text-white font-bold uppercase text-[10px] tracking-[0.2em]">
                          <tr>
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
                            const name = m.MethodName || m.methodName;
                            const verb = m.Verb || m.verb || "GET";
                            const sqlTypes = m.SqlType || m.sqlType || [];
                            const tables =
                              m.TargetTables || m.targetTables || [];
                            const verbColor =
                              verb === "GET"
                                ? "bg-blue-100 text-blue-700"
                                : verb === "POST"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-orange-100 text-orange-700";

                            return (
                              <tr
                                key={i}
                                className="hover:bg-purple-50 cursor-pointer transition-all group"
                                onClick={() => handleCodemapClick(name)}
                              >
                                <td className="p-4 font-black text-purple-600 font-mono text-sm">
                                  {name}
                                </td>
                                <td className="p-4 text-center">
                                  <span
                                    className={`px-2 py-1 rounded text-[10px] font-black ${verbColor}`}
                                  >
                                    {verb}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <div className="flex gap-1">
                                    {sqlTypes.map((t) => (
                                      <span
                                        key={t}
                                        className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold border border-slate-200"
                                      >
                                        {t}
                                      </span>
                                    ))}
                                    {sqlTypes.length === 0 && (
                                      <span className="text-slate-300 text-[10px]">
                                        None
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-4 text-sm font-bold text-slate-600">
                                  {tables.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {tables.map((t) => (
                                        <span
                                          key={t}
                                          className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100"
                                        >
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-300 italic">
                                      No Database Activity
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                } catch (e) {
                  return (
                    <div className="p-10 text-red-500 font-bold">
                      Data Error: {e.message}
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
