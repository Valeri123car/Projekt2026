import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api/client';

const METODA_META = {
  GET:    { barva: "#1d4ed8", bg: "#dbeafe",  label: "GET"    },
  POST:   { barva: "#166534", bg: "#dcfce7",  label: "POST"   },
  PUT:    { barva: "#92400e", bg: "#fef3c7",  label: "PUT"    },
  DELETE: { barva: "#991b1b", bg: "#fee2e2",  label: "DELETE" },
  PATCH:  { barva: "#6b21a8", bg: "#f3e8ff",  label: "PATCH"  },
};

const URL_KATEGORIJA = {
  "/api/v1/admin":     { label: "Administracija", ikona: "admin_panel_settings", barva: "#1d4ed8" },
  "/api/v1/voznje":    { label: "Vožnje",          ikona: "directions_car",       barva: "#0891b2" },
  "/api/v1/racuni":    { label: "Računi",           ikona: "receipt",              barva: "#166534" },
  "/api/v1/stranke":   { label: "Stranke",          ikona: "people",               barva: "#6b21a8" },
  "/api/v1/vozila":    { label: "Vozila",           ikona: "airport_shuttle",      barva: "#92400e" },
  "/api/v1/urnik":     { label: "Urnik",            ikona: "calendar_month",       barva: "#c2410c" },
  "/api/v1/dashboard": { label: "Dashboard",        ikona: "dashboard",            barva: "#374151" },
  "/api/v1/tahograf":  { label: "Tahograf",         ikona: "speed",                barva: "#0f766e" },
  "/api/v1/log":       { label: "Log",              ikona: "history",              barva: "#374151" },
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
  return { label: url || "-", ikona: "link", barva: "#374151" };
}

function formatCas(timestamp) {
  if (!timestamp) return "-";
  const d = new Date(timestamp);
  return d.toLocaleDateString("sl-SI") + " " +
    d.toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function GrafPoUrah({ logs }) {
  const ure = Array.from({ length: 24 }, (_, i) => ({ ura: i, count: 0 }));
  logs.forEach((log) => {
    const h = new Date(log.timestamp).getHours();
    ure[h].count++;
  });
  const max = Math.max(1, ...ure.map((u) => u.count));
  const zdajUra = new Date().getHours();

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-8">
      <h3 className="font-bold text-gray-900 mb-1">Aktivnost po urah</h3>
      <p className="text-xs text-gray-400 mb-4">Število sprememb po uri — trenutni nabor podatkov</p>
      <div className="flex items-end gap-1 h-20">
        {ure.map((u) => {
          const visina = Math.max(2, (u.count / max) * 80);
          const jeZdaj = u.ura === zdajUra;
          return (
            <div key={u.ura} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div
                className="w-full rounded-sm transition-all"
                style={{
                  height: `${visina}px`,
                  backgroundColor: jeZdaj ? "#2563eb" : u.count > 0 ? "#93c5fd" : "#e5e7eb",
                }}
              />
              {u.count > 0 && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                  {u.ura}:00 — {u.count}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-xs text-gray-400">00:00</span>
        <span className="text-xs text-gray-400">06:00</span>
        <span className="text-xs text-gray-400">12:00</span>
        <span className="text-xs text-gray-400">18:00</span>
        <span className="text-xs text-gray-400">23:00</span>
      </div>
    </div>
  );
}

function BreakdownKartice({ logs }) {
  const metodeSt = {};
  const kategorijeSt = {};

  logs.forEach((log) => {
    metodeSt[log.metoda] = (metodeSt[log.metoda] || 0) + 1;
    const kat = urlKategorija(log.url);
    kategorijeSt[kat.label] = (kategorijeSt[kat.label] || 0) + 1;
  });

  const skupajMetod = logs.length || 1;
  const skupajKat = logs.length || 1;

  const topMetode = Object.entries(metodeSt)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  const topKategorije = Object.entries(kategorijeSt)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4">Razporeditev po metodah</h3>
        {topMetode.length === 0 ? (
          <p className="text-xs text-gray-400">Ni podatkov</p>
        ) : (
          <div className="space-y-3">
            {topMetode.map(([metoda, count]) => {
              const meta = METODA_META[metoda] || { barva: "#374151", bg: "#f3f4f6", label: metoda };
              const pct = Math.round((count / skupajMetod) * 100);
              return (
                <div key={metoda}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-bold"
                        style={{ color: meta.barva, backgroundColor: meta.bg }}>
                        {meta.label}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: meta.barva }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4">Najpogosteje urejani moduli</h3>
        {topKategorije.length === 0 ? (
          <p className="text-xs text-gray-400">Ni podatkov</p>
        ) : (
          <div className="space-y-3">
            {topKategorije.map(([naziv, count]) => {
              const katMeta = Object.values(URL_KATEGORIJA).find((k) => k.label === naziv);
              const barva = katMeta?.barva || "#374151";
              const pct = Math.round((count / skupajKat) * 100);
              return (
                <div key={naziv}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-1.5">
                      {katMeta && (
                        <span className="material-symbols-outlined text-sm" style={{ color: barva }}>
                          {katMeta.ikona}
                        </span>
                      )}
                      <span className="text-xs font-medium text-gray-700">{naziv}</span>
                    </div>
                    <span className="text-xs text-gray-500">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barva }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuditLog() {
  const [filter, setFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [logs, setLogs] = useState([]);
  const [vseLogs, setVseLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ skupaj: 0, danes: 0, uporabniki: 0 });

  const ITEMS_PER_PAGE = 20;

  useEffect(() => { fetchLogs(); }, [filter, currentPage]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append("page", currentPage);
      params.append("limit", ITEMS_PER_PAGE);
      if (filter === "last24h") params.append("filter", "last24h");

      const [res, vsiRes] = await Promise.all([
        api.get(`/admin/audit?${params}`),
        api.get("/admin/audit?page=1&limit=500"),
      ]);

      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
      setVseLogs(vsiRes.data.logs || []);
      setStats({
        skupaj: res.data.totalVsi || 0,
        danes: res.data.steviloDanes || 0,
        uporabniki: res.data.steviloUporabnikov || 0,
      });
    } catch {
      setError("Napaka pri nalaganju dnevnika revizije");
    } finally {
      setLoading(false);
    }
  };

  const logsZaGraf = filter === "last24h" ? logs : vseLogs;

  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-72 flex-1 p-8 bg-gray-50 min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dnevnik revizije</h1>
          <p className="text-gray-500 text-sm mt-1">Pregled vseh sprememb v sistemu</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm text-center">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2">Skupaj akcij</p>
            <p className="text-3xl font-bold text-gray-900">{stats.skupaj.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">POST / PUT / DELETE</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm text-center">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2">Zadnjih 24h</p>
            <p className="text-3xl font-bold text-blue-600">{stats.danes}</p>
            <p className="text-xs text-gray-400 mt-1">sprememb danes</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm text-center">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2">Aktivni uporabniki</p>
            <p className="text-3xl font-bold text-green-600">{stats.uporabniki}</p>
            <p className="text-xs text-gray-400 mt-1">v dnevniku</p>
          </div>
        </div>

        <GrafPoUrah logs={logsZaGraf} />

        <BreakdownKartice logs={logsZaGraf} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-blue-600">shield_lock</span>
              <h3 className="font-bold text-gray-900">GDPR skladnost</h3>
            </div>
            <p className="text-xs text-gray-500 mb-4">Vse spremembe podatkov so zabeležene v skladu z GDPR.</p>
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
                { label: "Šifriranje baze",  vrednost: "AES-256",     barva: "text-blue-600" },
                { label: "Hramba logov",      vrednost: "12 mesecev",  barva: "text-gray-900" },
                { label: "Šifriranje EMŠO",   vrednost: "AES-256-CBC", barva: "text-blue-600" },
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
            { key: "all",     label: "Vse spremembe", ikona: "filter_list" },
            { key: "last24h", label: "Zadnjih 24h",   ikona: "schedule"    },
          ].map((f) => (
            <button key={f.key}
              onClick={() => { setFilter(f.key); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg border text-sm flex items-center gap-2 ${
                filter === f.key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}>
              <span className="material-symbols-outlined text-sm">{f.ikona}</span>
              {f.label}
            </button>
          ))}
          <div className="ml-auto text-sm text-gray-500 flex items-center">{total} zapisov</div>
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
                          <span className="material-symbols-outlined text-sm" style={{ color: kat.barva }}>{kat.ikona}</span>
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