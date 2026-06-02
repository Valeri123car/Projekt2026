import React, { useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api/client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function Vozniki() {
  const ITEMS_PER_PAGE = 4;
  const RIDES_PER_PAGE = 5;

  const [vozniki, setVozniki] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedDriver, setSelectedDriver] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [rides, setRides] = useState([]);
  const [ridesLoading, setRidesLoading] = useState(false);
  const [ridesError, setRidesError] = useState(null);
  const [ridesPage, setRidesPage] = useState(1);
  const [pdfLoading, setPdfLoading] = useState(false);
  const reportRef = useRef(null);
  const pdfTemplateRef = useRef(null);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [vozniki.length]);

  const fetchVoznjeForDriver = async (driverId, od = '', doV = '') => {
    try {
      setRidesLoading(true);
      setRidesError(null);
      let url = `/admin/voznje?fk_uporabnik=${driverId}`;
      if (od) url += `&od=${od}`;
      if (doV) url += `&do=${doV}`;
      const response = await api.get(url);
      setRides(response.data || []);
      setRidesPage(1);
    } catch (err) {
      setRidesError(err.response?.data?.error || 'Napaka pri nalaganju voženj');
      setRides([]);
    } finally {
      setRidesLoading(false);
    }
  };

  const handleOpenDriverReport = async (driver) => {
    setSelectedDriver(driver);
    setDateFrom('');
    setDateTo('');
    setRides([]);
    setRidesError(null);
    await fetchVoznjeForDriver(driver.id_uporabnik);
  };

  const handleFilterDates = async () => {
    if (!selectedDriver) return;
    await fetchVoznjeForDriver(selectedDriver.id_uporabnik, dateFrom, dateTo);
  };

  const handleResetFilter = async () => {
    if (!selectedDriver) return;
    setDateFrom('');
    setDateTo('');
    await fetchVoznjeForDriver(selectedDriver.id_uporabnik);
  };

  const formatDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('sl-SI', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateCompact = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const formatTime = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleTimeString('sl-SI', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return '-';
    const diffMin = Math.floor((new Date(end) - new Date(start)) / 60000);
    if (!Number.isFinite(diffMin) || diffMin <= 0) return '-';
    const hours = Math.floor(diffMin / 60);
    const minutes = diffMin % 60;
    return `${hours}h ${minutes.toString().padStart(2, '0')}min`;
  };

  const totalRideMinutes = useMemo(() => {
    return rides.reduce((sum, ride) => {
      if (!ride?.zacetek || !ride?.konc) return sum;
      const diff = Math.floor((new Date(ride.konc) - new Date(ride.zacetek)) / 60000);
      if (!Number.isFinite(diff) || diff <= 0) return sum;
      return sum + diff;
    }, 0);
  }, [rides]);

  const totalRideDurationLabel = useMemo(() => {
    const hours = Math.floor(totalRideMinutes / 60);
    const minutes = totalRideMinutes % 60;
    return `${hours}h ${minutes.toString().padStart(2, '0')}min`;
  }, [totalRideMinutes]);

  const reportPeriodLabel = useMemo(() => {
    if (dateFrom && dateTo) {
      return `${formatDateCompact(dateFrom)} - ${formatDateCompact(dateTo)}`;
    }

    if (rides.length === 0) {
      return 'Ni podatkov';
    }

    const sorted = [...rides]
      .map((ride) => new Date(ride.datum || ride.zacetek))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a - b);

    if (sorted.length === 0) return 'Ni podatkov';
    return `${formatDateCompact(sorted[0])} - ${formatDateCompact(sorted[sorted.length - 1])}`;
  }, [dateFrom, dateTo, rides]);

  const pdfRows = useMemo(() => {
    return [...rides].sort((a, b) => new Date(b.datum || b.zacetek) - new Date(a.datum || a.zacetek));
  }, [rides]);

  const generatePDF = async () => {
    if (!selectedDriver || !pdfTemplateRef.current) return;
    try {
      setPdfLoading(true);
      const canvas = await html2canvas(pdfTemplateRef.current, { scale: 2, backgroundColor: '#ffffff' });
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

      const fileName = `Porocilo_voznje_${selectedDriver.ime}_${selectedDriver.priimek}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      setRidesError('Napaka pri ustvarjanju PDF poročila');
    } finally {
      setPdfLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(vozniki.length / ITEMS_PER_PAGE));

  const paginatedVozniki = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return vozniki.slice(start, start + ITEMS_PER_PAGE);
  }, [vozniki, currentPage]);

  const startRow = vozniki.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endRow = Math.min(currentPage * ITEMS_PER_PAGE, vozniki.length);

  const ridesTotalPages = Math.max(1, Math.ceil(rides.length / RIDES_PER_PAGE));
  const ridesStartRow = rides.length === 0 ? 0 : (ridesPage - 1) * RIDES_PER_PAGE + 1;
  const ridesEndRow = Math.min(ridesPage * RIDES_PER_PAGE, rides.length);

  const paginatedRides = useMemo(() => {
    const start = (ridesPage - 1) * RIDES_PER_PAGE;
    return rides.slice(start, start + RIDES_PER_PAGE);
  }, [rides, ridesPage]);

  const getStatusLabel = (dostop) => {
    if (dostop === 2) return 'ADMIN';
    return 'VOZNIK';
  };

  if (selectedDriver) {
    return (
      <div className="flex">
        <Sidebar />
        <main className="ml-72 flex-1 p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
          <div className="mb-6">
            <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
              <button
                type="button"
                className="hover:text-slate-700"
                onClick={() => setSelectedDriver(null)}
              >
                Vozniki
              </button>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              <span className="font-medium text-slate-700">Poročilo o vožnjah</span>
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Poročilo o vožnjah</h1>
                <p className="text-slate-500 mt-1">Pregled in izvoz aktivnosti za izbranega voznika</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={generatePDF}
                  disabled={pdfLoading || rides.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                  {pdfLoading ? 'Izvažam PDF...' : 'Prenesi PDF'}
                </button>
              </div>
            </div>
          </div>

          {ridesError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {ridesError}
            </div>
          )}

          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <article className="lg:col-span-2 rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-4">Časovno obdobje</p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
                <div>
                  <label className="mb-1 block text-sm text-slate-600">Datum od</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-600">Datum do</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleFilterDates}
                  disabled={ridesLoading}
                  className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                >
                  {ridesLoading ? 'Filtriram...' : 'Filtriraj'}
                </button>
                <button
                  type="button"
                  onClick={handleResetFilter}
                  disabled={ridesLoading}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                  aria-label="Ponastavi obdobje"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                </button>
              </div>
            </article>

            <article className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Voznik</p>
              <div className="mt-2 flex items-start gap-3">
                <span className="material-symbols-outlined rounded-full bg-blue-700 p-2 text-white">person</span>
                <div>
                  <p className="text-3xl font-semibold text-slate-900 leading-tight">{selectedDriver.ime} {selectedDriver.priimek}</p>
                  <p className="mt-2 text-slate-600">{selectedDriver.email}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Izdelano: {new Date().toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </article>
          </section>

          <section ref={reportRef} className="rounded-xl border border-slate-300 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Seznam opravljenih voženj</h2>
              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">Skupaj voženj: {rides.length}</span>
            </div>

            {ridesLoading ? (
              <div className="px-5 py-10 text-center text-slate-500">Nalaganje voženj...</div>
            ) : rides.length === 0 ? (
              <div className="px-5 py-10 text-center text-slate-500">Ni voženj za izbrano obdobje</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] border-collapse">
                    <thead className="bg-slate-100">
                      <tr className="text-left text-sm font-semibold uppercase tracking-wide text-slate-600">
                        <th className="px-5 py-4">Datum in čas</th>
                        <th className="px-4 py-4">Trajanje</th>
                        <th className="px-4 py-4">Stranka</th>
                        <th className="px-4 py-4">Opis aktivnosti</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRides.map((ride) => (
                        <tr key={ride.id_voznja} className="border-t border-slate-200 hover:bg-slate-50">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined rounded-lg bg-blue-50 p-2 text-blue-600">local_shipping</span>
                              <div>
                                <p className="font-medium text-slate-900">{formatDate(ride.datum || ride.zacetek)}</p>
                                <p className="text-sm text-slate-500">{formatTime(ride.zacetek)} - {formatTime(ride.konc)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                              {calculateDuration(ride.zacetek, ride.konc)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-slate-700">{ride.stranka || '-'}</td>
                          <td className="px-4 py-4 text-slate-700">{ride.opis || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                  <p>
                    Prikazano {ridesStartRow}-{ridesEndRow} od {rides.length} rezultatov
                  </p>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setRidesPage((prev) => Math.max(1, prev - 1))}
                      disabled={ridesPage === 1}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Prejšnja stran voženj"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRidesPage((prev) => Math.min(ridesTotalPages, prev + 1))}
                      disabled={ridesPage >= ridesTotalPages}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Naslednja stran voženj"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>

          <div className="fixed -left-[99999px] top-0 z-[-1]">
            <section
              ref={pdfTemplateRef}
              className="w-[1120px] bg-white px-[64px] py-[58px] text-[#0f172a]"
              style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}
            >
              <header className="mb-10 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-700 text-white">
                    <span className="material-symbols-outlined text-[28px]">local_shipping</span>
                  </div>
                  <div>
                    <p className="text-[42px] font-bold uppercase tracking-tight text-blue-700">Sirena Admin</p>
                    <p className="text-[21px] uppercase tracking-wide text-slate-500">Logistični sistemi</p>
                  </div>
                </div>
                <h1 className="pt-1 text-[44px] font-bold uppercase tracking-tight text-slate-900">Poročilo o vožnjah</h1>
              </header>

              <section className="mb-10 rounded-2xl border border-slate-300 px-8 py-7">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[24px] font-semibold uppercase tracking-wide text-slate-500">Voznik</p>
                    <p className="mt-2 text-[38px] font-semibold text-slate-900">{selectedDriver.ime} {selectedDriver.priimek}</p>
                    <p className="mt-4 text-[24px] font-semibold uppercase tracking-wide text-slate-500">Email</p>
                    <p className="mt-1 text-[28px] text-slate-700">{selectedDriver.email}</p>
                  </div>
                  <div>
                    <p className="text-[24px] font-semibold uppercase tracking-wide text-slate-500">Obdobje</p>
                    <p className="mt-2 text-[38px] font-semibold text-slate-900">{reportPeriodLabel}</p>
                    <p className="mt-4 text-[24px] font-semibold uppercase tracking-wide text-slate-500">Datum izdelave</p>
                    <p className="mt-1 text-[28px] text-slate-700">{formatDateCompact(new Date())}</p>
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-300">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-left text-[24px] font-semibold uppercase tracking-wide text-slate-700">
                      <th className="px-6 py-5">Datum</th>
                      <th className="px-6 py-5">Trajanje</th>
                      <th className="px-6 py-5">Stranka</th>
                      <th className="px-6 py-5">Opis aktivnosti</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pdfRows.map((ride) => (
                      <tr key={`pdf-${ride.id_voznja}`} className="border-t border-slate-300 align-top text-[24px] text-slate-800">
                        <td className="px-6 py-4">
                          <p>{formatDateCompact(ride.datum || ride.zacetek)}</p>
                        </td>
                        <td className="px-6 py-4 font-medium">{calculateDuration(ride.zacetek, ride.konc)}</td>
                        <td className="px-6 py-4 font-medium">{ride.stranka || '-'}</td>
                        <td className="px-6 py-4 text-slate-700">{ride.opis || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <footer className="mt-10 border-t-4 border-blue-700 pt-8">
                <p className="text-[24px] font-semibold uppercase tracking-wide text-slate-500">Statistika poročila</p>
                <div className="mt-3 flex items-center gap-12 text-[30px]">
                  <p className="text-slate-600">
                    Skupaj voženj: <span className="font-bold text-slate-900">{rides.length}</span>
                  </p>
                  <p className="text-slate-600">
                    Skupaj ur: <span className="font-bold text-slate-900">{totalRideDurationLabel}</span>
                  </p>
                </div>
                <p className="mt-6 text-center text-[20px] text-slate-500">Stran 1 / 1</p>
              </footer>
            </section>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-72 flex-1 p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Vozniki</h1>
              <p className="text-slate-500 mt-1">Pregled vseh voznikov v bazi podatkov</p>           
          </div>
          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              type="button"
              onClick={fetchVozniki}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              {loading ? 'Osvežujem...' : 'Osveži'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Skupaj voznikov</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="material-symbols-outlined rounded-lg bg-blue-50 p-2 text-blue-600">group</span>
              <p className="text-2xl font-bold text-slate-900">{vozniki.length}</p>
            </div>
          </article>
        </section>

        {loading && !vozniki.length ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-500 shadow-sm">
            Nalaganje voznikov...
          </div>
        ) : vozniki.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-500 shadow-sm">
            Ni registriranih voznikov
          </div>
        ) : (
          <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead className="bg-slate-100">
                  <tr className="text-left text-sm font-semibold tracking-wide text-slate-600 uppercase">
                    <th className="px-5 py-4">Voznik</th>
                    <th className="px-4 py-4">ID št.</th>
                    <th className="px-4 py-4">E-pošta</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedVozniki.map((voznik) => (
                    <tr key={voznik.id_uporabnik} className="border-t border-slate-200 hover:bg-slate-50/80">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined rounded-lg bg-blue-50 p-2 text-blue-600">person</span>
                          <p className="font-medium text-slate-900">{voznik.ime} {voznik.priimek}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{voznik.id_uporabnik}</td>
                      <td className="px-4 py-4 text-slate-700">{voznik.email}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide ${
                          voznik.dostop === 2
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {getStatusLabel(voznik.dostop)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          className="inline-flex items-center rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          aria-label={`Odpri poročilo voženj za ${voznik.ime} ${voznik.priimek}`}
                          onClick={() => handleOpenDriverReport(voznik)}
                        >
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Prikazano {startRow}-{endRow} od {vozniki.length} voznikov
              </p>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Prejšnja stran"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-blue-600 px-2 text-xs font-semibold text-white">
                  {currentPage}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Naslednja stran"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
