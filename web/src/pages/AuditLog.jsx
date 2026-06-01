import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api/client';

const METODA_META = {
  GET:    { barva: "#1d4ed8", bg: "#dbeafe", label: "GET" },
  POST:   { barva: "#166534", bg: "#dcfce7", label: "POST" },
  PUT:    { barva: "#92400e", bg: "#fef3c7", label: "PUT" },
  DELETE: { barva: "#991b1b", bg: "#fee2e2", label: "DELETE" },
  PATCH:  { barva: "#6b21a8", bg: "#f3e8ff", label: "PATCH" },
};

const URL_KATEGORIJA = {
  "/api/v1/admin":     { label: "Administracija", ikona: "admin_panel_settings" },
  "/api/v1/voznje":    { label: "Vožnje",          ikona: "directions_car" },
  "/api/v1/racuni":    { label: "Računi",           ikona: "receipt" },
  "/api/v1/stranke":   { label: "Stranke",          ikona: "people" },
  "/api/v1/vozila":    { label: "Vozila",           ikona: "airport_shuttle" },
  "/api/v1/urnik":     { label: "Urnik",            ikona: "calendar_month" },
  "/api/v1/dashboard": { label: "Dashboard",        ikona: "dashboard" },
  "/api/v1/log":       { label: "Log",              ikona: "history" },
};

function MetodaBadge({ metoda }) {
  const meta = METODA_META[metoda] || { barva: "#374151", bg: "#f3f4f6", label: metoda || "-" };
  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-bold"
      style={{ color: meta.barva, backgroundColor: meta.bg }}>
      {meta.label}
    </span>
  );
}

function urlKategorija(url) {
  for (const [prefix, meta] of Object.entries(URL_KATEGORIJA)) {
    if (url?.startsWith(prefix)) return meta;
  }
  return { label: url || "-", ikona: "link" };
}

function formatCas(timestamp) {
  if (!timestamp) return "-";
  const d = new Date(timestamp);
  return d.toLocaleDateString("sl-SI") + " " + d.toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function AuditLog() {
  const [filter, setFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ skupaj: 0, danes: 0, uporabniki: 0 });

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    fetchLogs();
  }, [filter, currentPage]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append("page", currentPage);
      params.append("limit", ITEMS_PER_PAGE);
      if (filter === "last24h") params.append("filter", "last24h");

      const res = await api.get(`/admin/audit?${params}`);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);

      const vseLogs = await api.get("/admin/audit?page=1&limit=1000");
      const vsi = vseLogs.data.logs || [];
      const pred24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const danes = vsi.filter((l) => new Date(l.timestamp) >= pred24h).length;
      const uniqueUsers = new Set(vsi.map((l) => l.user)).size;
      setStats({ skupaj: vseLogs.data.total || 0, danes, uporabniki: uniqueUsers });
    } catch (err) {
      setError("Napaka pri nalaganju dnevnika revizije");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-72 flex-1 p-8 bg-gray-50 min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dnevnik revizije</h1>
          <p className="text-gray-500 text-sm mt-1">Pregled vseh aktivnosti v sistemu</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm text-center">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2">Skupaj akcij</p>
            <p className="text-3xl font-bold text-gray-900">{stats.skupaj.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">vseh časov</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm text-center">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2">Zadnjih 24h</p>
            <p className="text-3xl font-bold text-blue-600">{stats.danes}</p>
            <p className="text-xs text-gray-400 mt-1">akcij danes</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm text-center">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2">Aktivni uporabniki</p>
            <p className="text-3xl font-bold text-green-600">{stats.uporabniki}</p>
            <p className="text-xs text-gray-400 mt-1">v dnevniku</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-blue-600">shield_lock</span>
              <h3 className="font-bold text-gray-900">GDPR skladnost</h3>
            </div>
            <p className="text-xs text-gray-500 mb-4">Vse operacije dostopa in sprememb podatkov so zabeležene v skladu z GDPR.</p>
            <button className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-sm">download</span>
              Izvoz dnevnika (CSV)
            </button>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-yellow-600">lock</span>
              <h3 className="font-bold text-gray-900">Status zaščite podatkov</h3>
            </div>
            <div className="space-y-2">
              {[
                { label: "Šifriranje baze", vrednost: "AES-256", barva: "text-blue-600" },
                { label: "Hramba logov", vrednost: "12 mesecev", barva: "text-gray-900" },
                { label: "Šifriranje EMŠO", vrednost: "AES-256-CBC", barva: "text-blue-600" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded">
                  <span className="text-xs text-gray-500">{item.label}</span>
                  <span className={`text-xs font-bold ${item.barva}`}>{item.vrednost}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {[
            { key: "all", label: "Vse akcije", ikona: "filter_list" },
            { key: "last24h", label: "Zadnjih 24h", ikona: "schedule" },
          ].map((f) => (
            <button key={f.key}
              onClick={() => { setFilter(f.key); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg border text-sm flex items-center gap-2 ${filter === f.key ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}>
              <span className="material-symbols-outlined text-sm">{f.ikona}</span>
              {f.label}
            </button>
          ))}
          <div className="ml-auto text-sm text-gray-500 flex items-center">
            {total} zapisov
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg p-12 text-center text-gray-500">Nalaganje...</div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center text-gray-500">Ni zapisov</div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Čas", "Uporabnik", "Metoda", "Kategorija", "URL"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const kat = urlKategorija(log.url);
                  return (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap text-xs">{formatCas(log.timestamp)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
                            {log.user?.charAt(0) || "?"}
                          </div>
                          <span className="font-medium text-gray-900 text-xs">{log.user}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><MetodaBadge metoda={log.metoda} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-gray-400">{kat.ikona}</span>
                          <span className="text-gray-700 text-xs">{kat.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs font-mono truncate max-w-xs">{log.url}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm">
            ← Prejšnja
          </button>
          <span className="text-sm text-gray-600">
            Stran <strong>{currentPage}</strong> od <strong>{totalPages}</strong>
          </span>
          <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm">
            Naslednja →
          </button>
        </div>
      </main>
    </div>
  );
}