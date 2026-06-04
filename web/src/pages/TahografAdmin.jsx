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
  NEZNANO:         { label: "Neznano",         barva: "#6b7280", bg: "#f3f4f6" },
};

function StanjeBadge({ stanje }) {
  const meta = STANJE_META[stanje] || STANJE_META.DRUGO;
  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
      style={{ color: meta.barva, backgroundColor: meta.bg }}>
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

// ── Filter funkcija izvlečena iz .filter callback ─────────────────────────────
function filterDatum(zacetek, filters) {
  if (filters.od && zacetek < new Date(filters.od)) return false;
  if (filters.do) {
    const do_ = new Date(filters.do);
    do_.setHours(23, 59, 59, 999);
    if (zacetek > do_) return false;
  }
  return true;
}

function filterPosadka(posadka, filterVal) {
  if (filterVal === "da" && !posadka) return false;
  if (filterVal === "ne" && posadka) return false;
  return true;
}

function filterZapis(z, filters) {
  const zacetek = new Date(z.zacetek);
  if (!filterDatum(zacetek, filters)) return false;
  if (filters.voznik && z.fk_uporabnik !== Number.parseInt(filters.voznik)) return false;
  if (filters.stanja.length > 0 && !filters.stanja.includes(z.stanje)) return false;
  if (filters.vir && z.vir !== filters.vir) return false;
  if (!filterPosadka(z.posadka, filters.posadka)) return false;
  if (filters.registrska && z.registrska !== filters.registrska) return false;
  return true;
}

function MesecniPregled({ zapisi }) {
  const [selectedVoznik, setSelectedVoznik] = useState("");
  const [selectedMonth, setSelectedMonth]   = useState(new Date().toISOString().slice(0, 7));
  const [grafNacin, setGrafNacin]           = useState("aktivno");

  const uniqueVozniki = Array.from(
    new Map(zapisi.map((z) => [z.fk_uporabnik, z.uporabnik])).entries()
  ).map(([id, u]) => ({ id, ime: u?.ime || "", priimek: u?.priimek || "" }))
    .sort((a, b) => (a.priimek + a.ime).localeCompare(b.priimek + b.ime));

  const izracunajDnevneUre = () => {
    if (!selectedVoznik) return [];
    const [year, month] = selectedMonth.split("-").map(Number);
    const daysInMonth   = new Date(year, month, 0).getDate();
    const dnevno        = {};
    for (let i = 1; i <= daysInMonth; i++) {
      dnevno[i] = { VOZNJA: 0, DELO: 0, ODMOR: 0, POCITEK: 0, RAZPOLOZLJIVOST: 0, DRUGO: 0, NEZNANO: 0 };
    }
    zapisi.forEach((z) => {
      if (z.fk_uporabnik !== parseInt(selectedVoznik)) return;
      if (!z.konec) return;
      const trajMin = z.trajanje_min || Math.round((new Date(z.konec) - new Date(z.zacetek)) / 60000);
      if (!trajMin) return;
      const d = new Date(z.zacetek);
      if (d.getFullYear() !== year || d.getMonth() + 1 !== month) return;
      const dan    = d.getDate();
      const stanje = z.stanje in dnevno[dan] ? z.stanje : "DRUGO";
      if (dnevno[dan]) dnevno[dan][stanje] += trajMin;
    });
    return Object.entries(dnevno).map(([dan, s]) => ({
      dan:             parseInt(dan),
      voznja:          Math.round(s.VOZNJA / 60 * 100) / 100,
      delo:            Math.round(s.DELO / 60 * 100) / 100,
      odmor:           Math.round(s.ODMOR / 60 * 100) / 100,
      pocitek:         Math.round(s.POCITEK / 60 * 100) / 100,
      razpolozljivost: Math.round(s.RAZPOLOZLJIVOST / 60 * 100) / 100,
    }));
  };

  const podatki   = izracunajDnevneUre();
  const maxAktivno = Math.max(2, ...podatki.map((d) => d.voznja + d.delo));
  const maxVse     = Math.max(12, ...podatki.map((d) => d.voznja + d.delo + d.odmor + d.pocitek + d.razpolozljivost));

  const renderGraf = (maxUre, getSkupaj, barovi) => (
    <svg className="w-full h-72" viewBox="0 0 1200 320" preserveAspectRatio="xMidYMid meet">
      <rect width="1200" height="320" fill="white" />
      <line x1="60" y1="20" x2="60" y2="260" stroke="#e5e7eb" strokeWidth="1" />
      <line x1="60" y1="260" x2="1180" y2="260" stroke="#e5e7eb" strokeWidth="1" />
      {grafNacin === "aktivno" && (() => {
        const y8 = 260 - (8 / maxUre) * 240;
        if (y8 < 20) return null;
        return (
          <>
            <line x1="60" y1={y8} x2="1180" y2={y8} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5,4" />
            <text x="52" y={y8 + 4} fontSize="10" fill="#ef4444" textAnchor="end">8h</text>
          </>
        );
      })()}
      {(() => {
        const step   = maxUre <= 4 ? 1 : maxUre <= 12 ? 2 : maxUre <= 24 ? 4 : 8;
        const labels = [];
        for (let i = 0; i <= maxUre; i += step) labels.push(i);
        return labels.map((label) => {
          const y = 260 - (label / maxUre) * 240;
          return (
            <g key={label}>
              <line x1="60" y1={y} x2="1180" y2={y} stroke="#f3f4f6" strokeWidth="1" />
              <text x="52" y={y + 4} fontSize="10" fill="#9ca3af" textAnchor="end">{label}h</text>
            </g>
          );
        });
      })()}
      {podatki.map((d, i) => {
        const barWidth   = (1120 / podatki.length) * 0.7;
        const barSpacing = 1120 / podatki.length;
        const x          = 60 + i * barSpacing + (barSpacing - barWidth) / 2;
        const skupaj     = getSkupaj(d);
        let yPos         = 260;
        return (
          <g key={d.dan}>
            {barovi.map(({ kljuc, barva }) => {
              const px = (d[kljuc] / maxUre) * 240;
              if (px <= 0) return null;
              yPos -= px;
              return <rect key={kljuc} x={x} y={yPos} width={barWidth} height={px} fill={barva} />;
            })}
            <text x={x + barWidth / 2} y="278" fontSize="10" fill="#9ca3af" textAnchor="middle">{d.dan}</text>
            {skupaj > 0 && (
              <text x={x + barWidth / 2} y={260 - (skupaj / maxUre) * 240 - 3}
                fontSize="9" fill="#374151" textAnchor="middle">{skupaj.toFixed(1)}h</text>
            )}
          </g>
        );
      })}
    </svg>
  );

  return (
    <div className="mt-12 p-6 bg-gray-50 rounded-lg border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Mesečni pregled ur</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Voznik</label>
          <select value={selectedVoznik} onChange={(e) => setSelectedVoznik(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Izberi voznika...</option>
            {uniqueVozniki.map((v) => <option key={v.id} value={v.id}>{v.ime} {v.priimek}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mesec</label>
          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prikaz</label>
          <div className="flex gap-2">
            <button onClick={() => setGrafNacin("aktivno")}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${grafNacin === "aktivno" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}>
              Aktivni čas
            </button>
            <button onClick={() => setGrafNacin("vse")}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${grafNacin === "vse" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}>
              Vsa stanja
            </button>
          </div>
        </div>
      </div>
      {selectedVoznik ? (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          {grafNacin === "aktivno" ? (
            <>
              <p className="text-sm text-gray-500 mb-4">Dnevne ure vožnje in dela — brez počitka in odmora</p>
              {renderGraf(maxAktivno, (d) => d.voznja + d.delo, [
                { kljuc: "delo",   barva: "#6b21a8" },
                { kljuc: "voznja", barva: "#1d4ed8" },
              ])}
              <div className="flex gap-6 mt-4 flex-wrap text-sm">
                {[{ barva: "#1d4ed8", label: "Vožnja" }, { barva: "#6b21a8", label: "Delo" }].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.barva }} />
                    <span className="text-gray-600">{item.label}</span>
                  </div>
                ))}
                <span className="text-gray-400 text-xs ml-auto">Rdeča črta = 8h meja vožnje</span>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">Razporeditev vseh stanj po dnevih</p>
              {renderGraf(maxVse, (d) => d.voznja + d.delo + d.odmor + d.pocitek + d.razpolozljivost, [
                { kljuc: "pocitek",         barva: "#166534" },
                { kljuc: "odmor",           barva: "#92400e" },
                { kljuc: "razpolozljivost", barva: "#c2410c" },
                { kljuc: "delo",            barva: "#6b21a8" },
                { kljuc: "voznja",          barva: "#1d4ed8" },
              ])}
              <div className="flex gap-6 mt-4 flex-wrap text-sm">
                {[
                  { barva: "#1d4ed8", label: "Vožnja" },
                  { barva: "#6b21a8", label: "Delo" },
                  { barva: "#c2410c", label: "Razpoložljivost" },
                  { barva: "#92400e", label: "Odmor" },
                  { barva: "#166534", label: "Počitek" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.barva }} />
                    <span className="text-gray-600">{item.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-600">Izberi voznika za prikaz podatkov</div>
      )}
    </div>
  );
}

const EMPTY_FILTERS = {
  od: "", do: "", voznik: "", stanja: [], vir: "", posadka: "", registrska: "",
};

export default function TahografAdmin() {
  const [zapisi, setZapisi]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters]       = useState(EMPTY_FILTERS);
  const [sortField, setSortField]   = useState("zacetek");
  const [sortDir, setSortDir]       = useState("desc");

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

  const uniqueRegistrske = [...new Set(zapisi.map((z) => z.registrska).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

  const setFilter = (key, val) => {
    setFilters((f) => ({ ...f, [key]: val }));
    setCurrentPage(1);
  };

  const toggleStanje = (stanje) => {
    setFilters((f) => {
      const next = f.stanja.includes(stanje)
        ? f.stanja.filter((s) => s !== stanje)
        : [...f.stanja, stanje];
      return { ...f, stanja: next };
    });
    setCurrentPage(1);
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
    setCurrentPage(1);
  };

  const getSortValues = (a, b) => {
    if (sortField === "zacetek" || sortField === "konec") {
      return [new Date(a[sortField] || 0), new Date(b[sortField] || 0)];
    }
    if (sortField === "trajanje_min") return [a.trajanje_min ?? -1, b.trajanje_min ?? -1];
    if (sortField === "voznik") {
      const av = a.uporabnik ? `${a.uporabnik.priimek} ${a.uporabnik.ime}` : "";
      const bv = b.uporabnik ? `${b.uporabnik.priimek} ${b.uporabnik.ime}` : "";
      return [av, bv];
    }
    return [a[sortField] ?? "", b[sortField] ?? ""];
  };

  const filtered = zapisi
    .filter((z) => filterZapis(z, filters))
    .sort((a, b) => {
      const [av, bv] = getSortValues(a, b);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const totalPages       = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paged            = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="material-symbols-outlined text-[13px] text-gray-300 ml-1">unfold_more</span>;
    return <span className="material-symbols-outlined text-[13px] text-blue-600 ml-1">{sortDir === "asc" ? "arrow_upward" : "arrow_downward"}</span>;
  };

  return (
    <>
      <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Filtri</h2>
          {hasActiveFilters && (
            <button onClick={() => { setFilters(EMPTY_FILTERS); setCurrentPage(1); }}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
              <span className="material-symbols-outlined text-[14px]">close</span>
              Počisti vse
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Od datuma</label>
            <input type="date" value={filters.od} onChange={(e) => setFilter("od", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Do datuma</label>
            <input type="date" value={filters.do} onChange={(e) => setFilter("do", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Voznik</label>
            <select value={filters.voznik} onChange={(e) => setFilter("voznik", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Vsi vozniki</option>
              {uniqueVozniki.map((v) => <option key={v.id} value={v.id}>{v.ime} {v.priimek}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Registrska</label>
            <select value={filters.registrska} onChange={(e) => setFilter("registrska", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Vse</option>
              {uniqueRegistrske.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Vir</label>
            <select value={filters.vir} onChange={(e) => setFilter("vir", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Vsi viri</option>
              <option value="UVOZ">Uvoz (DDD/Excel)</option>
              <option value="ROCNO">Ročno</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Posadka</label>
            <select value={filters.posadka} onChange={(e) => setFilter("posadka", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Vse</option>
              <option value="da">Da</option>
              <option value="ne">Ne</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Stanje</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(STANJE_META).map(([key, meta]) => {
              const active = filters.stanja.includes(key);
              return (
                <button key={key} type="button" onClick={() => toggleStanje(key)}
                  className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                  style={active
                    ? { backgroundColor: meta.barva, color: "#fff", borderColor: meta.barva }
                    : { backgroundColor: meta.bg, color: meta.barva, borderColor: meta.barva + "60" }
                  }>
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
        <span>
          Prikazano: <strong>{filtered.length === 0 ? 0 : Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filtered.length)}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}</strong> od <strong>{filtered.length}</strong>
          {filtered.length !== zapisi.length && <span className="ml-1 text-gray-400">(filtrirano iz {zapisi.length})</span>}
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
                {[
                  { key: "voznik",       label: "Voznik" },
                  { key: "stanje",       label: "Stanje" },
                  { key: "zacetek",      label: "Začetek" },
                  { key: "konec",        label: "Konec" },
                  { key: "trajanje_min", label: "Trajanje" },
                  { key: "registrska",   label: "Registrska" },
                  { key: "posadka",      label: "Posadka" },
                  { key: "vir",          label: "Vir" },
                ].map(({ key, label }) => (
                  <th key={key} onClick={() => handleSort(key)}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:text-gray-900 select-none">
                    <span className="inline-flex items-center">{label}<SortIcon field={key} /></span>
                  </th>
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