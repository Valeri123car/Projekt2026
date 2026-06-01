import { useState, useEffect } from "react";
import api from "../api/client";

const ITEMS_PER_PAGE = 20;

const STANJE_META = {
  VOZNJA:          { label: "Vožnja",         barva: "#1d4ed8", bg: "#dbeafe" },
  ODMOR:           { label: "Odmor",           barva: "#92400e", bg: "#fef3c7" },
  POCITEK:         { label: "Počitek",         barva: "#166534", bg: "#dcfce7" },
  DELO:            { label: "Delo",            barva: "#6b21a8", bg: "#f3e8ff" },
  RAZPOLOZLJIVOST: { label: "Razpoložljivost", barva: "#c2410c", bg: "#ffedd5" },
  DRUGO:           { label: "Drugo",           barva: "#374151", bg: "#f3f4f6" },
};

function StanjeBadge({ stanje }) {
  const meta = STANJE_META[stanje] || STANJE_META.DRUGO;
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
      style={{ color: meta.barva, backgroundColor: meta.bg }}
    >
      {meta.label}
    </span>
  );
}

function formatDT(str) {
  if (!str) return "-";
  const d = new Date(str);
  return d.toLocaleDateString("sl-SI") + " " + d.toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" });
}

function formatTrajanje(min) {
  if (!min && min !== 0) return "-";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  return `${h}h ${m}min`;
}

function MesecniPregled({ zapisi }) {
  const [selectedVoznik, setSelectedVoznik] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const uniqueVozniki = Array.from(
    new Map(zapisi.map((z) => [z.fk_uporabnik, z.uporabnik])).entries()
  ).map(([id, u]) => ({ id, ime: u?.ime || "", priimek: u?.priimek || "" }))
    .sort((a, b) => (a.priimek + a.ime).localeCompare(b.priimek + b.ime));

  const izracunajDnevneUre = () => {
    if (!selectedVoznik) return [];
    const [year, month] = selectedMonth.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const dnevno = {};
    for (let i = 1; i <= daysInMonth; i++) dnevno[i] = { VOZNJA: 0, DELO: 0, ODMOR: 0, POCITEK: 0, RAZPOLOZLJIVOST: 0, DRUGO: 0 };

    zapisi.forEach((z) => {
      if (z.fk_uporabnik !== parseInt(selectedVoznik)) return;
      if (!z.konec || !z.trajanje_min) return;
      const d = new Date(z.zacetek);
      if (d.getFullYear() !== year || d.getMonth() + 1 !== month) return;
      const dan = d.getDate();
      if (dnevno[dan] && dnevno[dan][z.stanje] !== undefined) {
        dnevno[dan][z.stanje] += z.trajanje_min;
      }
    });

    return Object.entries(dnevno).map(([dan, stanja]) => ({
      dan: parseInt(dan),
      voznja: Math.round(stanja.VOZNJA / 60 * 100) / 100,
      delo: Math.round(stanja.DELO / 60 * 100) / 100,
      odmor: Math.round(stanja.ODMOR / 60 * 100) / 100,
      pocitek: Math.round(stanja.POCITEK / 60 * 100) / 100,
    }));
  };

  const podatki = izracunajDnevneUre();
  const maxUre = Math.max(12, ...podatki.map((d) => d.voznja + d.delo + d.odmor + d.pocitek));

  return (
    <div className="mt-12 p-6 bg-gray-50 rounded-lg border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Mesečni pregled ur</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Voznik</label>
          <select
            value={selectedVoznik}
            onChange={(e) => setSelectedVoznik(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Izberi voznika...</option>
            {uniqueVozniki.map((v) => (
              <option key={v.id} value={v.id}>{v.ime} {v.priimek}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mesec</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {selectedVoznik ? (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <svg className="w-full h-96" viewBox="0 0 1200 420" preserveAspectRatio="xMidYMid meet">
            <rect width="1200" height="420" fill="white" />
            <line x1="60" y1="20" x2="60" y2="350" stroke="#ccc" strokeWidth="2" />
            <line x1="60" y1="350" x2="1180" y2="350" stroke="#ccc" strokeWidth="2" />

            {(() => {
              const y8 = 350 - (8 / maxUre) * 330;
              return (
                <>
                  <line x1="60" y1={y8} x2="1180" y2={y8} stroke="#ef4444" strokeWidth="2" strokeDasharray="5,5" />
                  <text x="20" y={y8 + 4} fontSize="12" fill="#ef4444" fontWeight="bold">8h</text>
                </>
              );
            })()}

            {(() => {
              const step = maxUre <= 12 ? 2 : maxUre <= 24 ? 4 : 6;
              const labels = [];
              for (let i = 0; i <= maxUre; i += step) labels.push(i);
              return labels.map((label) => {
                const y = 350 - (label / maxUre) * 330;
                return (
                  <g key={label}>
                    <line x1="55" y1={y} x2="1180" y2={y} stroke="#f0f0f0" strokeWidth="1" />
                    <text x="50" y={y + 4} fontSize="11" fill="#666" textAnchor="end">{label}h</text>
                  </g>
                );
              });
            })()}

            {podatki.map((d, i) => {
              const barWidth = (1120 / podatki.length) * 0.75;
              const barSpacing = 1120 / podatki.length;
              const x = 60 + i * barSpacing + (barSpacing - barWidth) / 2;

              const voznjaPx = (d.voznja / maxUre) * 330;
              const deloPx = (d.delo / maxUre) * 330;
              const odmorPx = (d.odmor / maxUre) * 330;
              const pocitekPx = (d.pocitek / maxUre) * 330;
              const skupaj = d.voznja + d.delo + d.odmor + d.pocitek;

              let yPos = 350;
              return (
                <g key={d.dan}>
                  {pocitekPx > 0 && (() => { yPos -= pocitekPx; return <rect x={x} y={yPos} width={barWidth} height={pocitekPx} fill="#166534" rx="0" />; })()}
                  {odmorPx > 0 && (() => { yPos -= odmorPx; return <rect x={x} y={yPos} width={barWidth} height={odmorPx} fill="#92400e" rx="0" />; })()}
                  {deloPx > 0 && (() => { yPos -= deloPx; return <rect x={x} y={yPos} width={barWidth} height={deloPx} fill="#6b21a8" rx="0" />; })()}
                  {voznjaPx > 0 && (() => { const topY = yPos - voznjaPx; return <rect x={x} y={topY} width={barWidth} height={voznjaPx} fill="#1d4ed8" rx="2" />; })()}
                  <text x={x + barWidth / 2} y="370" fontSize="11" fill="#666" textAnchor="middle">{d.dan}</text>
                  {skupaj > 0 && (
                    <text x={x + barWidth / 2} y={350 - (skupaj / maxUre) * 330 - 4} fontSize="9" fill="#374151" textAnchor="middle">
                      {skupaj.toFixed(1)}h
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          <div className="flex gap-6 mt-4 flex-wrap text-sm">
            {[
              { barva: "#1d4ed8", label: "Vožnja" },
              { barva: "#6b21a8", label: "Delo" },
              { barva: "#92400e", label: "Odmor" },
              { barva: "#166534", label: "Počitek" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.barva }}></div>
                <span className="text-gray-600">{item.label}</span>
              </div>
            ))}
            <span className="text-gray-400 text-xs ml-auto">Rdeča črta = 8h meja</span>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-600">Izberi voznika za prikaz podatkov</div>
      )}
    </div>
  );
}

export default function TahografAdmin() {
  const [zapisi, setZapisi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({ od: "", do: "", voznik: "" });

  useEffect(() => { fetchZapisi(); }, []);

  const fetchZapisi = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/admin/tahograf");
      setZapisi(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Napaka pri nalaganju");
    } finally {
      setLoading(false);
    }
  };

  const uniqueVozniki = Array.from(
    new Map(zapisi.map((z) => [z.fk_uporabnik, z.uporabnik])).entries()
  ).map(([id, u]) => ({ id, ime: u?.ime || "", priimek: u?.priimek || "" }))
    .sort((a, b) => (a.priimek + a.ime).localeCompare(b.priimek + b.ime));

  const filtered = zapisi.filter((z) => {
    if (filters.od && new Date(z.zacetek) < new Date(filters.od)) return false;
    if (filters.do) {
      const do_ = new Date(filters.do);
      do_.setHours(23, 59, 59, 999);
      if (new Date(z.zacetek) > do_) return false;
    }
    if (filters.voznik && z.fk_uporabnik !== parseInt(filters.voznik)) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paged = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const setFilter = (key, val) => {
    setFilters((f) => ({ ...f, [key]: val }));
    setCurrentPage(1);
  };

  return (
    <>
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Filtri</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Od datuma</label>
            <input type="date" value={filters.od} onChange={(e) => setFilter("od", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Do datuma</label>
            <input type="date" value={filters.do} onChange={(e) => setFilter("do", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Voznik</label>
            <select value={filters.voznik} onChange={(e) => setFilter("voznik", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Vsi vozniki</option>
              {uniqueVozniki.map((v) => (
                <option key={v.id} value={v.id}>{v.ime} {v.priimek}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => { setFilters({ od: "", do: "", voznik: "" }); setCurrentPage(1); }}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">
              Počisti
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
        <span>
          Prikazano: <strong>{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filtered.length)}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}</strong> od <strong>{filtered.length}</strong>
        </span>
        <div className="flex gap-2 items-center">
          <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
            className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-40 hover:bg-blue-700">Prejšnja</button>
          <span>Stran <strong>{currentPage}</strong> od <strong>{totalPages}</strong></span>
          <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}
            className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-40 hover:bg-blue-700">Naslednja</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Nalaganje...</div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Ni tahografskih zapisov za izbrane filtre.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="w-full text-sm bg-white">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Voznik", "Stanje", "Začetek", "Konec", "Trajanje", "Registrska", "Posadka", "Vir"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((z) => (
                <tr key={z.id_zapis} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {z.uporabnik ? `${z.uporabnik.ime} ${z.uporabnik.priimek}` : "-"}
                  </td>
                  <td className="px-4 py-3"><StanjeBadge stanje={z.stanje} /></td>
                  <td className="px-4 py-3 text-gray-700">{formatDT(z.zacetek)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatDT(z.konec)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatTrajanje(z.trajanje_min)}</td>
                  <td className="px-4 py-3 text-gray-700">{z.registrska || "-"}</td>
                  <td className="px-4 py-3 text-gray-700">{z.posadka ? "Da" : "Ne"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${z.vir === "UVOZ" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
                      {z.vir === "UVOZ" ? "Uvoz" : "Posneto"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MesecniPregled zapisi={zapisi} />
    </>
  );
}