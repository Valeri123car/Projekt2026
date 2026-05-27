import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api/client';

export default function AuditLog() {
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1); //ven
  const [searchTerm, setSearchTerm] = useState(''); //ven
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalLogs, setTotalLogs] = useState(0);

  const itemsPerPage = 6;

  // Fetch audit logs from API
  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query params
      const params = new URLSearchParams();
      params.append('page', currentPage);
      params.append('limit', itemsPerPage);
      
      if (searchTerm) params.append('search', searchTerm);
      if (filter === 'last24h') params.append('filter', 'last24h');
      
        const response = await api.get(`/admin/audit?${params}`); //TODO: ustvari potreben endpoint za prikaz dnevnika
      let logs = response.data.logs || response.data;
      
      if (filter === 'last24h') {
        logs = filterLast24h(logs);
      }
      
      setAuditLogs(logs);
      setTotalLogs(logs.length);
    } catch (err) {
      setError('Napaka pri nalaganju dnevnika revizije');
      console.error('Error fetching audit logs:', err);
      // Fallback to placeholder data if API not ready
      let logs = getPlaceholderData();
      if (filter === 'last24h') {
        logs = filterLast24h(logs);
      }
      setAuditLogs(logs);
      setTotalLogs(logs.length);
    } finally {
      setLoading(false);
    }
  };

  // Placeholder data for development
  const getPlaceholderData = () => [
    { id: 1, timestamp: '2026-05-26 14:22:01', user: 'Admin Valeri', action: 'Logra', object: 'Invoice', ip: '192.168.1.42', details: 'View' },
    { id: 2, timestamp: '2026-05-26 13:45:12', user: 'Luka Cresnar', action: 'Summons', object: 'Driver ID #332', ip: '212.18.23.15', details: 'Edit' },
    { id: 3, timestamp: '2026-05-25 12:10:55', user: 'Rok Krajnc', action: 'Desktop', object: 'Vozniki Panel', ip: '10.0.4.155', details: 'Access' },
    { id: 4, timestamp: '2026-05-24 10:02:30', user: 'Domen Drovenik', action: 'Summons', object: 'Retention Policy', ip: '192.168.1.42', details: 'Delete' },
    { id: 5, timestamp: '2026-05-23 16:45:20', user: 'Luka Tovornik', action: 'Logra', object: 'User Account', ip: '172.16.0.50', details: 'Create' },
    { id: 6, timestamp: '2026-05-23 14:30:15', user: 'Alen Mraz', action: 'Desktop', object: 'Settings', ip: '192.168.1.42', details: 'Modify' },
    { id: 7, timestamp: '2026-05-23 14:30:15', user: 'Vid Šafranko', action: 'Desktop', object: 'Settings', ip: '192.168.1.42', details: 'Modify' },
  ];

    const filterLast24h = (logs) => {
    const referenceDate = new Date();
    const twentyFourHoursAgo = new Date(referenceDate.getTime() - 24 * 60 * 60 * 1000);
    
    return logs.filter(log => {
      const logDate = new Date(log.timestamp.replace(' ', 'T'));
      return logDate >= twentyFourHoursAgo;
    });
  };

   const getPaginatedLogs = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return auditLogs.slice(startIndex, endIndex);
  };

  // Fetch on component mount and when filter/search/page changes
  useEffect(() => {
    fetchAuditLogs();
  }, [filter, currentPage, searchTerm]);

  const totalPages = Math.ceil(totalLogs / itemsPerPage);

  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-72 flex-1 p-8 bg-gray-50 min-h-screen w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Dnevnik revizije</h1>
            <p className="text-gray-500 text-xs sm:text-sm">Spremljajte vse aktivnosti v sistemu</p>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {/* GDPR Compliance Card */}
          <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-start gap-3 mb-4">
              <span className="material-symbols-outlined text-blue-600 text-lg sm:text-xl">shield_lock</span>
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base text-gray-900">GDPR SKLADNOST</h3>
                <p className="text-xs text-gray-600 mt-1">Dnevnik revizije in GDPR varnost</p>
                <p className="text-xs text-gray-500 mt-1">Popisy pregled naš vsemi operacijami dostopanja in spremenjenim podatkov.</p>
              </div>
            </div>
            <button className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm hover:bg-gray-50 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-sm">download</span>
              <span className="hidden sm:inline">Izvoz dnevnika (CSV)</span>
              <span className="sm:hidden">Izvoz CSV</span>
            </button>
          </div>

          {/* Data Protection Status Card */}
          <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-start gap-3 mb-4">
              <span className="material-symbols-outlined text-yellow-600 text-lg sm:text-xl">lock</span>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-gray-900">Status zaščite podatkov</h3>
              </div>
            </div>
            <div className="space-y-2 sm:space-y-3">
              <div className="bg-blue-50 p-2 sm:p-3 rounded">
                <p className="text-xs text-gray-600">Šifriranje baze:</p>
                <p className="text-xs sm:text-sm font-bold text-red-600">AES-256</p>
              </div>
              <div className="bg-blue-50 p-2 sm:p-3 rounded">
                <p className="text-xs text-gray-600">Hramljena zapora:</p>
                <p className="text-xs sm:text-sm font-bold">12 mesecev</p>
              </div>
              <div className="bg-blue-50 p-2 sm:p-3 rounded">
                <p className="text-xs text-gray-600">Zadnja revizija:</p>
                <p className="text-xs sm:text-sm font-bold">24. 05. 2024</p>
              </div>
            </div>
            <div className="mt-3 p-2 bg-green-50 rounded text-xs text-green-700">
              Zaščitenost: 85%
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm text-center">
            <p className="text-gray-600 text-xs sm:text-sm font-semibold mb-2">SKUPNA DOSTOKOV</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">14,282</p>
            <p className="text-xs text-gray-500 mt-2">↑ 12% danes</p>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm text-center">
            <p className="text-gray-600 text-xs sm:text-sm font-semibold mb-2">KRITIČNA DEJANJA</p>
            <p className="text-2xl sm:text-3xl font-bold text-red-600">42</p>
            <p className="text-xs text-gray-500 mt-2">Zadnjih 30 dni</p>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm text-center">
            <p className="text-gray-600 text-xs sm:text-sm font-semibold mb-2">AKTIVNI UPORABNIKI</p>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600">18</p>
            <p className="text-xs text-gray-500 mt-2">Trenutno online</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6">
          <button
            onClick={() => {
              setFilter('last24h');
              setCurrentPage(1);
            }}
            className={`px-3 sm:px-4 py-2 rounded-lg border text-xs sm:text-sm whitespace-nowrap ${
              filter === 'last24h'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            <span className="material-symbols-outlined inline mr-1 text-sm">schedule</span>
            Zadnjih 24ur
          </button>
          <button
            onClick={() => {
              setFilter('all');
              setCurrentPage(1);
            }}
            className={`px-3 sm:px-4 py-2 rounded-lg border text-xs sm:text-sm whitespace-nowrap ${
              filter === 'all'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            <span className="material-symbols-outlined inline mr-1 text-sm">filter_list</span>
            Vsa dejanja
          </button>
          <div className="ml-auto text-xs text-gray-500 pt-2">
            Prikazano 1-{getPaginatedLogs().length} od {totalLogs || getPaginatedLogs().length}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg p-8 text-center">
            <p className="text-gray-500">Nalaganje dnevnika...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Audit Log Table */}
        {!loading && auditLogs.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">ČASOVNI ŽIG</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap hidden sm:table-cell">UPORABNIK</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap hidden md:table-cell">DEJANJE</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">OBJEKT</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap hidden lg:table-cell">IP NASLOV</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">DETAILS</th>
                </tr>
              </thead>
              <tbody>
                {getPaginatedLogs().map((log) => (
                  <tr key={log.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">{log.timestamp}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm hidden sm:table-cell">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
                          {log.user.charAt(0)}
                        </div>
                        <div className="min-w-0 hidden sm:block">
                          <p className="font-medium text-gray-900 truncate">{log.user}</p>
                          <p className="text-xs text-gray-500">Admin</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm hidden md:table-cell">
                      <span className={`px-2 py-1 rounded text-xs font-medium inline-block ${
                        log.action === 'Logra' ? 'bg-red-100 text-red-700' :
                        log.action === 'Summons' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 min-w-0">
                      <div className="flex items-center gap-1 truncate">
                        <span className="material-symbols-outlined text-xs sm:text-sm text-gray-500 flex-shrink-0">
                          description
                        </span>
                        <span className="truncate">{log.object}</span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600 hidden lg:table-cell">{log.ip}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm">
                      <button className="p-1 hover:bg-gray-200 rounded">
                        <span className="material-symbols-outlined text-xs sm:text-sm">visibility</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {!loading && auditLogs.length === 0 && (
          <div className="bg-white rounded-lg p-6 sm:p-8 text-center">
            <p className="text-gray-500 text-sm sm:text-base">Ni najdenih zapisov revizije</p>
          </div>
        )}

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 sm:mt-6">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm w-full sm:w-auto"
          >
            ← Prejšnja
          </button>
          <div className="flex gap-1 sm:gap-2 flex-wrap justify-center">
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-2 sm:px-3 py-2 rounded-lg text-sm ${
                  currentPage === i + 1
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {i + 1}
              </button>
            ))}
            {totalPages > 5 && <span className="px-2 py-2 text-sm">...</span>}
            {totalPages > 5 && (
              <button
                onClick={() => setCurrentPage(totalPages)}
                className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                {totalPages}
              </button>
            )}
          </div>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm w-full sm:w-auto"
          >
            Naslednja →
          </button>
        </div>
      </main>
    </div>
  );
}