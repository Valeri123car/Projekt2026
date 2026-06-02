import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import api from "../api/client";
import TahografAdmin from "./TahografAdmin";

export default function Voznje() {
  const ITEMS_PER_PAGE = 20;

  const [voznje, setVoznje] = useState([]);
  const [filteredVoznje, setFilteredVoznje] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("voznje");

  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterVoznik, setFilterVoznik] = useState("");
  const [sortBy, setSortBy] = useState("datum-desc");

  const [selectedExportVozniki, setSelectedExportVozniki] = useState([]);
  const [selectedExportMonth, setSelectedExportMonth] = useState(new Date().toISOString().slice(0, 7));

  const uniqueVozniki = Array.from(
    new Set(voznje.map((v) => JSON.stringify({ id: v.fk_uporabnik, ime: v.uporabnik?.ime, priimek: v.uporabnik?.priimek })))
  ).map((v) => JSON.parse(v)).sort((a, b) => (a.ime + a.priimek).localeCompare(b.ime + b.priimek));

  useEffect(() => { fetchVoznje(); }, []);
  useEffect(() => { applyFiltersAndSort(); }, [voznje, filterDateFrom, filterDateTo, filterVoznik, sortBy]);

  const fetchVoznje = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/admin/voznje");
      setVoznje(response.data);
    } catch (err) {
      setError(err.response?.data?.error || "Napaka pri nalaganju vožnj");
    } finally {
      setLoading(false);
    }
  };

  const handleExportMonthlyReport = async () => {
    if (selectedExportVozniki.length === 0) { alert("Izberi vsaj enega voznika"); return; }
    try {
      const [year, month] = selectedExportMonth.split("-").map(Number);
      const monthStr = String(month).padStart(2, "0");
      const firstDay = `${year}-${monthStr}-01`;
      const lastDayNum = new Date(year, month, 0).getDate();
      const lastDay = `${year}-${monthStr}-${String(lastDayNum).padStart(2, "0")}`;
      const params = new URLSearchParams();
      selectedExportVozniki.forEach((id) => params.append("fk_uporabnik", id));
      params.append("od", firstDay);
      params.append("do", lastDay);
      const response = await api.get(`/voznje/voznjeMesec?${params.toString()}`);
      console.log("Monthly report:", response.data);
    } catch (err) {
      console.error("Error:", err);
      alert("Napaka pri izvozu mesečnega poročila");
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...voznje];
    if (filterDateFrom) filtered = filtered.filter((v) => new Date(v.datum) >= new Date(filterDateFrom));
    if (filterDateTo) {
      const dateTo = new Date(filterDateTo);
      dateTo.setHours(23, 59, 59, 999);
      filtered = filtered.filter((v) => new Date(v.datum) <= dateTo);
    }
    if (filterVoznik) filtered = filtered.filter((v) => v.fk_uporabnik === parseInt(filterVoznik));

    const [sortField, sortOrder] = sortBy.split("-");
    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (["datum", "zacetek", "konc"].includes(sortField)) { aVal = new Date(aVal); bVal = new Date(bVal); }
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    setFilteredVoznje(filtered);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;
    try {
      setUploadLoading(true);
      setUploadSuccess(false);
      setError(null);
      await api.get("/ddd_upload/test-upload");
      const formData = new FormData();
      formData.append("file", selectedFile);
      await api.post("/ddd_upload/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setUploadSuccess(true);
      setSelectedFile(null);
      const fi = document.querySelector('input[type="file"]');
      if (fi) fi.value = "";
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Napaka pri nalaganju datoteke");
    } finally {
      setUploadLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("sl-SI") + " " + date.toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" });
  };

  const izracunajVoznjePoMesecih = () => {
    const meseci = {};
    voznje.forEach((v) => {
      const mesec = new Date(v.zacetek).toISOString().slice(0, 7);
      if (!meseci[mesec]) meseci[mesec] = 0;
      meseci[mesec]++;
    });
    return Object.entries(meseci)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([mesec, stevilo]) => ({
        mesec,
        label: new Date(mesec + "-01").toLocaleDateString("sl-SI", { month: "short", year: "2-digit" }),
        stevilo,
      }));
  };

  const izracunajTrajanje = (zacetek, konec) => {
  if (!zacetek || !konec) return "-";
  const diff = Math.floor((new Date(konec) - new Date(zacetek)) / 60000);
  if (diff <= 0) return "-";
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h === 0) return `${m}min`;
  return `${h}h ${m}min`;
};

  const voznjePoMesecih = izracunajVoznjePoMesecih();
  const maxVoznje = Math.max(1, ...voznjePoMesecih.map((m) => m.stevilo));

  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-72 flex-1 p-8 bg-gray-50 min-h-screen">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Vožnje</h1>
          <div className="flex gap-1 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab("voznje")}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === "voznje" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              Vožnje
            </button>
            <button
              onClick={() => setActiveTab("tahograf")}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === "tahograf" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              Tahografski zapisi
            </button>
          </div>
        </div>

        {activeTab === "tahograf" ? (
          <TahografAdmin />
        ) : (
          <>
            {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}
            {uploadSuccess && <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">Datoteka je bila uspešno naložena</div>}

            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Naloži DDD ali Excel datoteko</label>
                <div className="flex gap-3 items-center">
                  <input type="file" accept=".ddd,.DDD,.xlsx,.xls"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    disabled={uploadLoading}
                    className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button onClick={handleFileUpload} disabled={!selectedFile || uploadLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
                    {uploadLoading ? "Nalaganje..." : "Naloži"}
                  </button>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Izvozi mesečno poročilo</label>
                <div className="flex gap-3 items-center">
                  <select multiple value={selectedExportVozniki.map(String)}
                    onChange={(e) => setSelectedExportVozniki(Array.from(e.target.selectedOptions, (o) => parseInt(o.value)))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" size={1}>
                    <option value="">Izberi voznika...</option>
                    {uniqueVozniki.map((v) => <option key={v.id} value={v.id}>{v.ime} {v.priimek}</option>)}
                  </select>
                  <input type="month" value={selectedExportMonth} onChange={(e) => setSelectedExportMonth(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button onClick={handleExportMonthlyReport} disabled={selectedExportVozniki.length === 0}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
                    Izvozi
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Filtri in razvrščanje</h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Od datuma</label>
                  <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Do datuma</label>
                  <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Voznik</label>
                  <select value={filterVoznik} onChange={(e) => setFilterVoznik(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Vsi vozniki</option>
                    {uniqueVozniki.map((v) => <option key={v.id} value={v.id}>{v.ime} {v.priimek}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Razvrsti po</label>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="datum-desc">Datum (najnovejše)</option>
                    <option value="datum-asc">Datum (najstarejše)</option>
                    <option value="stranka-asc">Stranka (A-Z)</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); setFilterVoznik(""); setSortBy("datum-desc"); setCurrentPage(1); }}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">
                    Počisti
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
              <div>
                Prikazane vožnje: <strong>{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredVoznje.length)}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredVoznje.length)}</strong> od <strong>{filteredVoznje.length}</strong> (skupaj {voznje.length})
              </div>
              <div className="flex gap-2 items-center">
                <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed">Prejšnja</button>
                <span className="px-3 py-1">Stran <strong>{currentPage}</strong> od <strong>{Math.ceil(filteredVoznje.length / ITEMS_PER_PAGE) || 1}</strong></span>
                <button onClick={() => setCurrentPage(Math.min(Math.ceil(filteredVoznje.length / ITEMS_PER_PAGE), currentPage + 1))}
                  disabled={currentPage >= Math.ceil(filteredVoznje.length / ITEMS_PER_PAGE)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed">Naslednja</button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-600">Nalaganje...</div>
            ) : filteredVoznje.length === 0 ? (
              <div className="text-center py-8 text-gray-600">Ni vožnj, ki bi se ujemale s filtri</div>
            ) : (
              <div className="overflow-x-auto shadow-md rounded-lg">
                <table className="w-full border-collapse bg-white">
                  <thead>
                    <tr className="bg-gray-100 border-b-2 border-gray-300">
                      {["Voznik", "Začetek", "Konec", "Trajanje", "Relacija", "Stranka", "Opis"].map((h) => (
                        <th key={h} className="px-6 py-3 text-left text-sm font-semibold text-gray-900">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVoznje.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((v) => (
                      <tr key={v.id_voznja} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{v.uporabnik ? `${v.uporabnik.ime} ${v.uporabnik.priimek}` : "-"}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{formatDateTime(v.zacetek)}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{formatDateTime(v.konc)}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{izracunajTrajanje(v.zacetek, v.konc)}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{v.relacija || "-"}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{v.stranka || "-"}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">{v.opis || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {voznjePoMesecih.length > 0 && (
              <div className="mt-12 p-6 bg-gray-50 rounded-lg border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Vožnje po mesecih</h2>
                <p className="text-sm text-gray-500 mb-6">Število ročno vnesenih voženj v zadnjih 12 mesecih</p>
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <svg className="w-full h-64" viewBox="0 0 1200 300" preserveAspectRatio="xMidYMid meet">
                    <rect width="1200" height="300" fill="white" />
                    <line x1="60" y1="20" x2="60" y2="240" stroke="#e5e7eb" strokeWidth="1" />
                    <line x1="60" y1="240" x2="1180" y2="240" stroke="#e5e7eb" strokeWidth="1" />
                    {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                      const val = Math.round(maxVoznje * frac);
                      const y = 240 - frac * 220;
                      return (
                        <g key={frac}>
                          <line x1="60" y1={y} x2="1180" y2={y} stroke="#f3f4f6" strokeWidth="1" />
                          <text x="52" y={y + 4} fontSize="11" fill="#9ca3af" textAnchor="end">{val}</text>
                        </g>
                      );
                    })}
                    {voznjePoMesecih.map((m, i) => {
                      const barWidth = (1120 / voznjePoMesecih.length) * 0.6;
                      const barSpacing = 1120 / voznjePoMesecih.length;
                      const x = 60 + i * barSpacing + (barSpacing - barWidth) / 2;
                      const barH = (m.stevilo / maxVoznje) * 220;
                      const y = 240 - barH;
                      return (
                        <g key={m.mesec}>
                          <rect x={x} y={y} width={barWidth} height={barH} fill="#2563eb" rx="4" opacity="0.85" />
                          <text x={x + barWidth / 2} y="258" fontSize="11" fill="#6b7280" textAnchor="middle">{m.label}</text>
                          {m.stevilo > 0 && (
                            <text x={x + barWidth / 2} y={y - 5} fontSize="11" fill="#2563eb" textAnchor="middle" fontWeight="bold">{m.stevilo}</text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}