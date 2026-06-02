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

  // Monthly review states
  const [selectedMonthVoznik, setSelectedMonthVoznik] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // Export states
  const [selectedExportVozniki, setSelectedExportVozniki] = useState([]);
  const [selectedExportMonth, setSelectedExportMonth] = useState(new Date().toISOString().slice(0, 7));

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

  const handleExportMonthlyReport = async () => {
    if (selectedExportVozniki.length === 0) {
      alert("Izberi vsaj enega voznika");
      return;
    }

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

      console.log("Fetching from:", `/voznje/voznjeMesec?${params.toString()}`);
      const response = await api.get(`/voznje/voznjeMesec?${params.toString()}`);
      console.log("Monthly report data:", response.data);
    } catch (err) {
      console.error("Error exporting monthly report:", err);
      console.error("Error response:", err.response?.data);
      alert("Napaka pri izvozu mesečnega poročila");
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

  // Calculate daily driving hours for monthly review
  const calculateDailyHours = () => {
    if (!selectedMonthVoznik) return [];

    const [year, month] = selectedMonth.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    // Initialize daily hours
    const dailyHours = {};
    for (let i = 1; i <= daysInMonth; i++) {
      dailyHours[i] = 0;
    }

    // Sum hours for each day
    voznje.forEach((voznja) => {
      if (voznja.fk_uporabnik !== parseInt(selectedMonthVoznik)) return;

      const voznjaDate = new Date(voznja.zacetek);
      const voznjaYear = voznjaDate.getFullYear();
      const voznjaMonth = voznjaDate.getMonth() + 1;

      if (voznjaYear === year && voznjaMonth === month && (voznja.aktivnost === "Vožnja" || voznja.aktivnost === "Delo")) {
        const day = voznjaDate.getDate();
        // Parse trajanje (e.g., "02:30" or "2.5" format) to hours
        let hours = 0;
        if (voznja.trajanje) {
          if (voznja.trajanje.includes(":")) {
            const parts = voznja.trajanje.split(":");
            hours = parseInt(parts[0]) + parseInt(parts[1]) / 60;
          } else {
            hours = parseFloat(voznja.trajanje);
          }
        }
        dailyHours[day] += hours;
      }
    });

    // Convert to array format for chart
    return Object.entries(dailyHours).map(([day, hours]) => ({
      day: parseInt(day),
      hours: Math.round(hours * 100) / 100, // Round to 2 decimals
    }));
  };

  const dailyHoursData = calculateDailyHours();

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

        {/* Upload and Export Section */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Upload Section */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Naloži DDD ali Excel datoteko
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="file"
                accept=".ddd,.DDD,.xlsx,.xls"
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

          {/* Export Monthly Report Section */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Izvozi mesečno poročilo
            </label>
            <div className="flex gap-3 items-center">
              {/* Vozniki Selection */}
              <select
                multiple
                value={selectedExportVozniki.map(String)}
                onChange={(e) =>
                  setSelectedExportVozniki(
                    Array.from(e.target.selectedOptions, (option) =>
                      parseInt(option.value)
                    )
                  )
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                size={1}
              >
                <option value="">Izberi voznika...</option>
                {uniqueVozniki.map((voznik) => (
                  <option key={voznik.id} value={voznik.id}>
                    {voznik.ime} {voznik.priimek}
                  </option>
                ))}
              </select>

              {/* Month Selection */}
              <input
                type="month"
                value={selectedExportMonth}
                onChange={(e) => setSelectedExportMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* Export Button */}
              <button
                onClick={handleExportMonthlyReport}
                disabled={selectedExportVozniki.length === 0}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
              >
                Izvozi
              </button>
            </div>
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

      {/* Monthly Review Section */}
      <div className="mt-12 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Mesečni pregled</h2>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Driver Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Voznik
            </label>
            <select
              value={selectedMonthVoznik}
              onChange={(e) => setSelectedMonthVoznik(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Izberi voznika...</option>
              {uniqueVozniki.map((voznik) => (
                <option key={voznik.id} value={voznik.id}>
                  {voznik.ime} {voznik.priimek}
                </option>
              ))}
            </select>
          </div>

          {/* Month Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mesec
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Chart */}
        {selectedMonthVoznik ? (
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <svg className="w-full h-96" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid meet">
              {/* Background */}
              <rect width="1200" height="400" fill="white" />

              {/* Y-axis */}
              <line x1="60" y1="20" x2="60" y2="350" stroke="#ccc" strokeWidth="2" />
              {/* X-axis */}
              <line x1="60" y1="350" x2="1180" y2="350" stroke="#ccc" strokeWidth="2" />

              {/* Red line at 8 hours */}
              {(() => {
                const maxHours = Math.max(12, Math.max(...dailyHoursData.map((d) => d.hours), 0));
                const eightHourPixels = 350 - (8 / maxHours) * 330;
                return (
                  <>
                    <line
                      x1="60"
                      y1={eightHourPixels}
                      x2="1180"
                      y2={eightHourPixels}
                      stroke="#ef4444"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                    />
                    <text
                      x="20"
                      y={eightHourPixels + 4}
                      fontSize="12"
                      fill="#ef4444"
                      fontWeight="bold"
                    >
                      8h
                    </text>
                  </>
                );
              })()}

              {/* Y-axis labels and grid */}
              {(() => {
                const maxHours = Math.max(12, Math.max(...dailyHoursData.map((d) => d.hours), 0));
                const step = maxHours <= 12 ? 2 : maxHours <= 24 ? 4 : 6;
                const labels = [];
                for (let i = 0; i <= maxHours; i += step) {
                  labels.push(i);
                }
                return labels.map((label) => {
                  const y = 350 - (label / maxHours) * 330;
                  return (
                    <g key={label}>
                      <line x1="55" y1={y} x2="60" y2={y} stroke="#999" strokeWidth="1" />
                      <text
                        x="10"
                        y={y + 4}
                        fontSize="12"
                        fill="#666"
                        textAnchor="end"
                      >
                        {label}h
                      </text>
                    </g>
                  );
                });
              })()}

              {/* Bars */}
              {dailyHoursData.map((data, index) => {
                const maxHours = Math.max(12, Math.max(...dailyHoursData.map((d) => d.hours), 0));
                const barWidth = (1120 / dailyHoursData.length) * 0.8;
                const barSpacing = 1120 / dailyHoursData.length;
                const x = 60 + index * barSpacing + (barSpacing - barWidth) / 2;
                const barHeight = (data.hours / maxHours) * 330;
                const y = 350 - barHeight;
                const isOverEight = data.hours > 8;

                return (
                  <g key={data.day}>
                    {/* Bar */}
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      fill={isOverEight ? "#ef4444" : "#3b82f6"}
                      rx="4"
                    />
                    {/* Day label */}
                    <text
                      x={x + barWidth / 2}
                      y="370"
                      fontSize="12"
                      fill="#666"
                      textAnchor="middle"
                    >
                      {data.day}
                    </text>
                    {/* Hours label on bar */}
                    {data.hours > 0 && (
                      <text
                        x={x + barWidth / 2}
                        y={y - 5}
                        fontSize="11"
                        fill={isOverEight ? "#ef4444" : "#3b82f6"}
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        {data.hours.toFixed(1)}h
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
            <div className="mt-4 text-sm text-gray-600">
              <p>Modre stolpce = do 8 ur/dan | Rdeče stolpce = več kot 8 ur/dan | Rdeča črta = 8h meja</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-600">
            Izberi voznika za prikaz podatkov
          </div>
        )}
      </div>
      </main>
    </div>
  );
}
