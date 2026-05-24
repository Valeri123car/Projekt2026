import React, { useEffect, useState, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api/client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function Vozniki() {
  const [vozniki, setVozniki] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedDriver, setExpandedDriver] = useState(null);
  const [voznje, setVoznje] = useState([]);
  const [voznje_loading, setVoznje_loading] = useState(false);
  const [voznje_error, setVoznje_error] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showVoznje, setShowVoznje] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const reportRef = useRef();

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

  const fetchVoznjeForDriver = async (driverId, od = '', do_ = '') => {
    try {
      setVoznje_loading(true);
      setVoznje_error(null);
      let url = `/admin/voznje?fk_uporabnik=${driverId}`;
      if (od) url += `&od=${od}`;
      if (do_) url += `&do=${do_}`;
      const response = await api.get(url);
      setVoznje(response.data);
    } catch (err) {
      setVoznje_error(err.response?.data?.error || 'Napaka pri nalaganju vožnj');
      console.error('Error fetching voznje:', err);
    } finally {
      setVoznje_loading(false);
    }
  };

  const handleDriverClick = async (driverId) => {
    if (expandedDriver === driverId) {
      setExpandedDriver(null);
      setDateFrom('');
      setDateTo('');
      setShowVoznje(false);
    } else {
      setExpandedDriver(driverId);
      setDateFrom('');
      setDateTo('');
      setShowVoznje(false);
    }
  };

  const handleFilterDates = async () => {
    if (expandedDriver) {
      await fetchVoznjeForDriver(expandedDriver, dateFrom, dateTo);
      setShowVoznje(true);
    }
  };

  const generatePDF = async () => {
    if (!reportRef.current) return;
    
    try {
      setPdfLoading(true);
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }
      
      const driver = vozniki.find(v => v.id_uporabnik === expandedDriver);
      const fileName = `Porocilo_${driver?.ime}_${driver?.priimek}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Napaka pri ustvarjanju PDF');
    } finally {
      setPdfLoading(false);
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
                  <React.Fragment key={voznik.id_uporabnik}>
                    <tr 
                      onClick={() => handleDriverClick(voznik.id_uporabnik)}
                      className="hover:bg-gray-100 cursor-pointer"
                    >
                      <td className="border border-gray-300 px-4 py-2">
                        {voznik.id_uporabnik}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">{voznik.ime}</td>
                      <td className="border border-gray-300 px-4 py-2">{voznik.priimek}</td>
                      <td className="border border-gray-300 px-4 py-2">{voznik.email}</td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                          {voznik.dostop === 1 ? 'Voznik' : `Level ${voznik.dostop}`}
                        </span>
                      </td>
                    </tr>
                    {expandedDriver === voznik.id_uporabnik && (
                      <tr>
                        <td colSpan="5" className="border border-gray-300 px-4 py-4 bg-gray-50">
                          <div className="ml-4">
                            <h3 className="font-bold mb-4">Vožnje voznika {voznik.ime} {voznik.priimek}</h3>
                            
                            {/* Date Filter */}
                            <div className="mb-4 p-3 bg-white border border-gray-300 rounded flex gap-3 items-end">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Od</label>
                                <input
                                  type="date"
                                  value={dateFrom}
                                  onChange={(e) => setDateFrom(e.target.value)}
                                  placeholder="dd/mm/yyyy"
                                  pattern="\d{2}/\d{2}/\d{4}"
                                  className="px-3 py-2 border border-gray-300 rounded"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Do</label>
                                <input
                                  type="date"
                                  value={dateTo}
                                  onChange={(e) => setDateTo(e.target.value)}
                                  placeholder="dd/mm/yyyy"
                                  pattern="\d{2}/\d{2}/\d{4}"
                                  className="px-3 py-2 border border-gray-300 rounded"
                                />
                              </div>
                              <button
                                onClick={handleFilterDates}
                                disabled={voznje_loading}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                              >
                                {voznje_loading ? 'Nalaganje...' : 'Filtriraj'}
                              </button>
                              <button
                                onClick={() => {
                                  setDateFrom('');
                                  setDateTo('');
                                  setShowVoznje(false);
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                Počisti
                              </button>
                              {showVoznje && voznje.length > 0 && (
                                <button
                                  onClick={generatePDF}
                                  disabled={pdfLoading}
                                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                >
                                  {pdfLoading ? 'Ustvarjam...' : 'Presnemi PDF'}
                                </button>
                              )}
                            </div>
                            
                            {showVoznje && (
                              <>
                                {voznje_error && (
                                  <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-3">
                                    {voznje_error}
                                  </div>
                                )}

                                {voznje_loading ? (
                                  <p className="text-gray-500">Nalaganje vožnj...</p>
                                ) : voznje.length === 0 ? (
                                  <p className="text-gray-500">Voznik nima registriranih vožnj v izbranem obdobju</p>
                                ) : (
                                  <div className="overflow-x-auto" ref={reportRef}>
                                    {/* PDF Header */}
                                    <div className="mb-4 pb-4 border-b-2 bg-white p-4">
                                      <h2 className="text-xl font-bold mb-2">POROČILO O VOŽNJAH</h2>
                                      <p className="text-sm"><strong>Voznik:</strong> {voznik.ime} {voznik.priimek}</p>
                                      <p className="text-sm"><strong>Email:</strong> {voznik.email}</p>
                                      <p className="text-sm"><strong>Obdobje:</strong> {dateFrom || 'Od začetka'} do {dateTo || 'Do konca'}</p>
                                      <p className="text-sm"><strong>Datum izdelave:</strong> {new Date().toLocaleDateString('sl-SI', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric'
                                      })}</p>
                                    </div>

                                    <table className="w-full border-collapse border border-gray-300 text-sm">
                                      <thead className="bg-gray-200">
                                        <tr>
                                          <th className="border border-gray-300 px-3 py-2 text-left">ID</th>
                                          <th className="border border-gray-300 px-3 py-2 text-left">Datum</th>
                                          <th className="border border-gray-300 px-3 py-2 text-left">Začetek</th>
                                          <th className="border border-gray-300 px-3 py-2 text-left">Konec</th>
                                          <th className="border border-gray-300 px-3 py-2 text-left">Stranka</th>
                                          <th className="border border-gray-300 px-3 py-2 text-left">Opis</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {voznje.map((voznja) => (
                                          <tr key={voznja.id_voznja} className="hover:bg-gray-100">
                                            <td className="border border-gray-300 px-3 py-2">{voznja.id_voznja}</td>
                                            <td className="border border-gray-300 px-3 py-2">
                                              {new Date(voznja.datum).toLocaleDateString('sl-SI', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric'
                                              })}
                                            </td>
                                            <td className="border border-gray-300 px-3 py-2">
                                              {new Date(voznja.zacetek).toLocaleTimeString('sl-SI', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: false,
                                              })}
                                            </td>
                                            <td className="border border-gray-300 px-3 py-2">
                                              {new Date(voznja.konc).toLocaleTimeString('sl-SI', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: false,
                                              })}
                                            </td>
                                            <td className="border border-gray-300 px-3 py-2">{voznja.stranka || '-'}</td>
                                            <td className="border border-gray-300 px-3 py-2">{voznja.opis || '-'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    
                                    {/* PDF Footer */}
                                    <div className="mt-4 pt-4 border-t-2 text-xs text-gray-600">
                                      <p>Skupaj voženj: {voznje.length}</p>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
