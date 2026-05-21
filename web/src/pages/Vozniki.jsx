import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar'
import api from '../api/client';

export default function Vozniki() {
  const [vozniki, setVozniki] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchVozniki = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/admin/vozniki');
      setVozniki(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Napaka pri nalaganju voznikov');
      console.error('Error fetching vozniki:', err);
    } finally {
      setLoading(false);
    }
  };

  
  useEffect(() => {
    fetchVozniki();
  }, []);

  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-72 flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Vozniki</h1>
          <button
            onClick={fetchVozniki}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Nalaganje...' : 'Osveži'}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading && !vozniki.length ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Nalaganje voznikov...</p>
          </div>
        ) : vozniki.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Ni registriranih voznikov</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left">ID</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Ime</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Priimek</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Email</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Dostop</th>
                </tr>
              </thead>
              <tbody>
                {vozniki.map((voznik) => (
                  <tr key={voznik.id_uporabnik} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">{voznik.id_uporabnik}</td>
                    <td className="border border-gray-300 px-4 py-2">{voznik.ime}</td>
                    <td className="border border-gray-300 px-4 py-2">{voznik.priimek}</td>
                    <td className="border border-gray-300 px-4 py-2">{voznik.email}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                        {voznik.dostop === 1 ? 'Voznik' : `Level ${voznik.dostop}`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-gray-500 mt-4 text-sm">Skupaj: {vozniki.length} voznikov</p>
          </div>
        )}
      </main>
    </div>
  );
}