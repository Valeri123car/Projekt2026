import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import api from "../api/client";

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

  // Filter states
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterVoznik, setFilterVoznik] = useState("");
  const [sortBy, setSortBy] = useState("datum-desc");

  // Get unique vozniki for filter dropdown
  const uniqueVozniki = Array.from(
    new Set(voznje.map((v) => JSON.stringify({ id: v.fk_uporabnik, ime: v.uporabnik?.ime, priimek: v.uporabnik?.priimek })))
  ).map(v => JSON.parse(v)).sort((a, b) => (a.ime + a.priimek).localeCompare(b.ime + b.priimek));

  // Fetch voznje on component mount
  useEffect(() => {
    fetchVoznje();
  }, []);

  // Apply filters and sorting
  useEffect(() => {
    applyFiltersAndSort();
  }, [voznje, filterDateFrom, filterDateTo, filterVoznik, sortBy]);

  const fetchVoznje = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/admin/voznje");
      setVoznje(response.data);
    } catch (err) {
      setError(err.response?.data?.error || "Napaka pri nalaganju vožnj");
      console.error("Error fetching voznje:", err);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...voznje];

    // Filter by date range
    if (filterDateFrom) {
      const dateFrom = new Date(filterDateFrom);
      filtered = filtered.filter((v) => new Date(v.datum) >= dateFrom);
    }

    if (filterDateTo) {
      const dateTo = new Date(filterDateTo);
      dateTo.setHours(23, 59, 59, 999);
      filtered = filtered.filter((v) => new Date(v.datum) <= dateTo);
    }

    // Filter by voznik (user ID)
    if (filterVoznik) {
      filtered = filtered.filter((v) => v.fk_uporabnik === parseInt(filterVoznik));
    }

    // Sort
    const [sortField, sortOrder] = sortBy.split("-");

    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle dates
      if (sortField === "datum" || sortField === "zacetek" || sortField === "konc") {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

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

      // Test endpoint first
      console.log("Testing endpoint...");
      await api.get("/ddd_upload/test-upload");
      console.log("Endpoint test passed!");

      // Proceed with actual upload
      const formData = new FormData();
      formData.append("file", selectedFile);

      await api.post("/ddd_upload/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setUploadSuccess(true);
      setSelectedFile(null);
      setTimeout(() => setUploadSuccess(false), 3000);
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = "";
    } catch (err) {
      setError(err.response?.data?.error || "Napaka pri nalaganju datoteke");
      console.error("Error uploading file:", err);
    } finally {
      setUploadLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const datePart = date.toLocaleDateString("sl-SI");
    const timePart = date.toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" });
    return `${datePart} ${timePart}`;
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-72 flex-1 p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Vožnje</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {uploadSuccess && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            Datoteka je bila uspešno naložena
          </div>
        )}

        {/* Upload Section */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Naloži DDD ali Excel datoteko
          </label>
          <div className="flex gap-3 items-center">
            <input
              type="file"
              accept=".ddd,.xlsx,.xls"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              disabled={uploadLoading}
              className="block text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4 file:rounded-lg
                file:border-0 file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleFileUpload}
              disabled={!selectedFile || uploadLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {uploadLoading ? "Nalaganje..." : "Naloži"}
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filtri in razvrščanje</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Date From Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Od datuma
              </label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date To Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Do datuma
              </label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Voznik Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Voznik
              </label>
              <select
                value={filterVoznik}
                onChange={(e) => setFilterVoznik(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Vsi vozniki</option>
                {uniqueVozniki.map((voznik) => (
                  <option key={voznik.id} value={voznik.id}>
                    {voznik.ime} {voznik.priimek}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Razvrsti po
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="datum-desc">Datum (najnovejše)</option>
                <option value="datum-asc">Datum (najstarejše)</option>
                <option value="trajanje-desc">Trajanje (najdlje)</option>
                <option value="trajanje-asc">Trajanje (najkrajše)</option>
                <option value="stranka-asc">Stranka (A-Z)</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterDateFrom("");
                  setFilterDateTo("");
                  setFilterVoznik("");
                  setSortBy("datum-desc");
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
              >
                Počisti
              </button>
            </div>
          </div>
        </div>

        {/* Results Count and Pagination */}
        <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
          <div>
            Prikazane vožnje: <strong>{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredVoznje.length)}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredVoznje.length)}</strong> od{" "}
            <strong>{filteredVoznje.length}</strong> (skupaj {voznje.length})
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prejšnja
            </button>
            <span className="px-3 py-1">
              Stran <strong>{currentPage}</strong> od <strong>{Math.ceil(filteredVoznje.length / ITEMS_PER_PAGE) || 1}</strong>
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(Math.ceil(filteredVoznje.length / ITEMS_PER_PAGE), currentPage + 1))}
              disabled={currentPage >= Math.ceil(filteredVoznje.length / ITEMS_PER_PAGE)}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Naslednja
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8 text-gray-600">Nalaganje...</div>
      ) : filteredVoznje.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          Ni vožnj, ki bi se ujemale s filtri
        </div>
      ) : (
        <div className="overflow-x-auto shadow-md rounded-lg">
          <table className="w-full border-collapse bg-white">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Voznik
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Zacetek
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Konec
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Trajanje
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Aktivnost
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Registerska
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Posadka
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Relacija
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Stranka
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredVoznje
                .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                .map((voznja) => (
                <tr key={voznja.id_voznja} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {voznja.uporabnik ? `${voznja.uporabnik.ime} ${voznja.uporabnik.priimek}` : "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {formatDateTime(voznja.zacetek)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {formatDateTime(voznja.konc)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {voznja.trajanje || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {voznja.aktivnost || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {voznja.registerska || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {voznja.posadka || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {voznja.relacija || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {voznja.stranka || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </main>
    </div>
  );
}
