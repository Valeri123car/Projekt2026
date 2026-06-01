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
  return (
    d.toLocaleDateString("sl-SI") +
    " " +
    d.toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" })
  );
}

function formatTrajanje(min) {
  if (!min && min !== 0) return "-";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  return `${h}h ${m}min`;
}

export default function TahografAdmin() {
  const [zapisi, setZapisi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({ od: "", do: "", voznik: "" });

  useEffect(() => {
    fetchZapisi();
  }, []);

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
  )
    .map(([id, u]) => ({ id, ime: u?.ime || "", priimek: u?.priimek || "" }))
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
  const paged = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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
            <input
              type="date"
              value={filters.od}
              onChange={(e) => setFilter("od", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Do datuma</label>
            <input
              type="date"
              value={filters.do}
              onChange={(e) => setFilter("do", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Voznik</label>
            <select
              value={filters.voznik}
              onChange={(e) => setFilter("voznik", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Vsi vozniki</option>
              {uniqueVozniki.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.ime} {v.priimek}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => { setFilters({ od: "", do: "", voznik: "" }); setCurrentPage(1); }}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
            >
              Počisti
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
        <span>
          Prikazano:{" "}
          <strong>
            {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filtered.length)}–
            {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}
          </strong>{" "}
          od <strong>{filtered.length}</strong>
        </span>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-40 hover:bg-blue-700"
          >
            Prejšnja
          </button>
          <span>
            Stran <strong>{currentPage}</strong> od <strong>{totalPages}</strong>
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-40 hover:bg-blue-700"
          >
            Naslednja
          </button>
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
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide"
                  >
                    {h}
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
                  <td className="px-4 py-3">
                    <StanjeBadge stanje={z.stanje} />
                  </td>
                  <td className="px-4 py-3 text-gray-700">{formatDT(z.zacetek)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatDT(z.konec)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatTrajanje(z.trajanje_min)}</td>
                  <td className="px-4 py-3 text-gray-700">{z.registrska || "-"}</td>
                  <td className="px-4 py-3 text-gray-700">{z.posadka ? "Da" : "Ne"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                        z.vir === "UVOZ"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {z.vir === "UVOZ" ? "Uvoz" : "Posneto"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}