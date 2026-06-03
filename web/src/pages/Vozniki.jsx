import React, { useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api/client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const DRIVER_COLORS = [
  { bg: 'bg-blue-500',    light: 'bg-blue-50 border-blue-200',   text: 'text-blue-700',   dot: '#3b82f6' },
  { bg: 'bg-emerald-500', light: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: '#10b981' },
  { bg: 'bg-violet-500',  light: 'bg-violet-50 border-violet-200', text: 'text-violet-700', dot: '#8b5cf6' },
  { bg: 'bg-rose-500',    light: 'bg-rose-50 border-rose-200',   text: 'text-rose-700',   dot: '#f43f5e' },
  { bg: 'bg-amber-500',   light: 'bg-amber-50 border-amber-200', text: 'text-amber-700',  dot: '#f59e0b' },
  { bg: 'bg-cyan-500',    light: 'bg-cyan-50 border-cyan-200',   text: 'text-cyan-700',   dot: '#06b6d4' },
  { bg: 'bg-fuchsia-500', light: 'bg-fuchsia-50 border-fuchsia-200', text: 'text-fuchsia-700', dot: '#d946ef' },
  { bg: 'bg-orange-500',  light: 'bg-orange-50 border-orange-200', text: 'text-orange-700', dot: '#f97316' },
];

const getDriverColor = (index) => DRIVER_COLORS[index % DRIVER_COLORS.length];

const DAYS_OF_WEEK = ['Pon', 'Tor', 'Sre', 'Čet', 'Pet', 'Sob', 'Ned'];
const MONTHS = [
  'Januar', 'Februar', 'Marec', 'April', 'Maj', 'Junij',
  'Julij', 'Avgust', 'September', 'Oktober', 'November', 'December',
];

const isoDate = (d) => {
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// ─── Event Detail Modal ───────────────────────────────────────────────────────
function EventDetailModal({ events, driverColorMap, onClose }) {
  if (!events || events.length === 0) return null;

  const formatCena = (cena) => {
    if (cena == null) return '-';
    return new Intl.NumberFormat('sl-SI', { style: 'currency', currency: 'EUR' }).format(cena);
  };

  const formatDatum = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined rounded-lg bg-blue-50 p-2 text-blue-600 text-[18px]">calendar_today</span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Vožnje na ta dan</h2>
              <p className="text-xs text-slate-500">{events.length} {events.length === 1 ? 'vnos' : 'vnosov'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="overflow-y-auto divide-y divide-slate-100">
          {events.map((ev, i) => {
            const color = driverColorMap[ev.fk_uporabnik] ?? DRIVER_COLORS[0];
            return (
              <div key={ev.id_urnik ?? i} className="px-6 py-4">
                {/* Driver name badge */}
                <div className="mb-3 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white ${color.bg}`}>
                    <span className="material-symbols-outlined text-[14px]">person</span>
                    {ev.uporabnik
                      ? `${ev.uporabnik.ime} ${ev.uporabnik.priimek}`
                      : `Voznik #${ev.fk_uporabnik}`}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
                    ev.placano
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-red-50 text-red-600 border-red-200'
                  }`}>
                    <span className="material-symbols-outlined text-[13px]">{ev.placano ? 'check_circle' : 'cancel'}</span>
                    {ev.placano ? 'Plačano' : 'Neplačano'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Datum</p>
                    <p className="mt-0.5 font-medium text-slate-800">{formatDatum(ev.datum)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Cena</p>
                    <p className="mt-0.5 font-medium text-slate-800">{formatCena(ev.cena)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Stranka</p>
                    <p className="mt-0.5 font-medium text-slate-800">
                      {ev.stranka
                        ? (ev.stranka.naziv ?? ev.stranka.ime ?? `#${ev.fk_stranka}`)
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Vozilo</p>
                    <p className="mt-0.5 font-medium text-slate-800">
                      {ev.vozilo
                        ? (ev.vozilo.registracija ?? ev.vozilo.naziv ?? `#${ev.fk_vozilo}`)
                        : '-'}
                    </p>
                  </div>
                  {ev.naziv && (
                    <div className="col-span-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Relacija / Naziv</p>
                      <p className="mt-0.5 font-medium text-slate-800">{ev.naziv}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Calendar ─────────────────────────────────────────────────────────────────
function DriversCalendar({ urnik, vozniki }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);
  const [filterDriver, setFilterDriver] = useState('vse');

  // Build driver→color map (stable by id)
  const driverColorMap = useMemo(() => {
    const map = {};
    vozniki.forEach((v, i) => {
      map[v.id_uporabnik] = getDriverColor(i);
    });
    return map;
  }, [vozniki]);

  const calendarDrivers = vozniki;

  // Group urnik entries by iso date
  const eventsByDate = useMemo(() => {
    const map = {};
    const filtered = filterDriver === 'vse'
      ? urnik
      : urnik.filter((e) => String(e.fk_uporabnik) === String(filterDriver));

    filtered.forEach((entry) => {
      const key = isoDate(entry.datum);
      if (!map[key]) map[key] = [];
      map[key].push(entry);
    });
    return map;
  }, [urnik, filterDriver]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    // Monday-based: 0=Mon … 6=Sun
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    return cells;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };
  const goToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); };

  const handleDayClick = (day) => {
    if (!day) return;
    const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const events = eventsByDate[key];
    if (events && events.length > 0) setSelectedDayEvents(events);
  };

  const todayKey = isoDate(today);

  return (
    <>
      {selectedDayEvents && (
        <EventDetailModal
          events={selectedDayEvents}
          driverColorMap={driverColorMap}
          onClose={() => setSelectedDayEvents(null)}
        />
      )}

      <section className="rounded-xl border border-slate-300 bg-white shadow-sm overflow-hidden">
        {/* Calendar header */}
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined rounded-lg bg-blue-50 p-1.5 text-blue-600 text-[20px]">calendar_month</span>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Urnik voženj</h2>
              <p className="text-xs text-slate-500">{urnik.length} vnosov skupaj</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Driver filter */}
            <select
              value={filterDriver}
              onChange={(e) => setFilterDriver(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="vse">Vsi vozniki</option>
              {calendarDrivers.map((v) => (
                <option key={v.id_uporabnik} value={v.id_uporabnik}>
                  {v.ime} {v.priimek}
                </option>
              ))}
            </select>

            {/* Month nav */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>
              <span className="min-w-[140px] text-center text-sm font-semibold text-slate-800">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>

            <button
              type="button"
              onClick={goToday}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Danes
            </button>
          </div>
        </div>

        {/* Driver legend */}
        {calendarDrivers.length > 0 && (
          <div className="border-b border-slate-100 bg-white px-5 py-2 flex flex-wrap gap-2">
            {calendarDrivers.map((v) => {
              const color = driverColorMap[v.id_uporabnik];
              return (
                <button
                  key={v.id_uporabnik}
                  type="button"
                  onClick={() => setFilterDriver(
                    filterDriver === String(v.id_uporabnik) ? 'vse' : String(v.id_uporabnik)
                  )}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-opacity ${
                    filterDriver !== 'vse' && filterDriver !== String(v.id_uporabnik)
                      ? 'opacity-30'
                      : ''
                  } ${color.light} ${color.text}`}
                >
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color.dot }} />
                  {v.ime} {v.priimek}
                </button>
              );
            })}
          </div>
        )}

        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {DAYS_OF_WEEK.map((d) => (
            <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="min-h-[90px] border-b border-r border-slate-100 bg-slate-50/50" />;
            }

            const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = eventsByDate[key] ?? [];
            const isToday = key === todayKey;
            const isWeekend = (idx % 7) >= 5;

            // Group events by driver to show compact dots
            const driverGroups = {};
            dayEvents.forEach((ev) => {
              if (!driverGroups[ev.fk_uporabnik]) driverGroups[ev.fk_uporabnik] = [];
              driverGroups[ev.fk_uporabnik].push(ev);
            });

            return (
              <div
                key={key}
                onClick={() => handleDayClick(day)}
                className={`min-h-[90px] border-b border-r border-slate-100 p-1.5 flex flex-col gap-1 transition-colors ${
                  dayEvents.length > 0 ? 'cursor-pointer hover:bg-blue-50/40' : ''
                } ${isWeekend ? 'bg-slate-50/60' : 'bg-white'}`}
              >
                {/* Day number */}
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                      isToday
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700'
                    }`}
                  >
                    {day}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] font-medium text-slate-400">{dayEvents.length}</span>
                  )}
                </div>

                {/* Event chips — show up to 3, then "+N more" */}
                <div className="flex flex-col gap-0.5 flex-1">
                  {Object.entries(driverGroups).slice(0, 3).map(([driverId, evs]) => {
                    const color = driverColorMap[Number(driverId)] ?? DRIVER_COLORS[0];
                    const driver = evs[0]?.uporabnik;
                    const label = driver
                      ? `${driver.ime} ${driver.priimek}`
                      : `#${driverId}`;
                    return (
                      <div
                        key={driverId}
                        className={`flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium border ${color.light} ${color.text} truncate`}
                      >
                        <span className="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: color.dot }} />
                        <span className="truncate">{label}</span>
                        {evs.length > 1 && <span className="flex-shrink-0 opacity-70">×{evs.length}</span>}
                      </div>
                    );
                  })}
                  {Object.keys(driverGroups).length > 3 && (
                    <p className="text-[10px] text-slate-400 pl-1">
                      +{Object.keys(driverGroups).length - 3} več
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Vozniki() {
  const ITEMS_PER_PAGE = 4;
  const RIDES_PER_PAGE = 5;

  const [vozniki, setVozniki] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [urnik, setUrnik] = useState([]);
  const [urnikLoading, setUrnikLoading] = useState(false);

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
    } finally {
      setLoading(false);
    }
  };

  const fetchUrnik = async () => {
    try {
      setUrnikLoading(true);
      const response = await api.get('/admin/urnik');
      setUrnik(response.data || []);
    } catch (err) {
      console.error('Error fetching urnik:', err);
    } finally {
      setUrnikLoading(false);
    }
  };

  useEffect(() => {
    fetchVozniki();
    fetchUrnik();
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
    return new Date(value).toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
    return new Date(value).toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit', hour12: false });
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
    if (dateFrom && dateTo) return `${formatDateCompact(dateFrom)} - ${formatDateCompact(dateTo)}`;
    if (rides.length === 0) return 'Ni podatkov';
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

  // ── Driver detail / report view ──────────────────────────────────────────
  if (selectedDriver) {
    return (
      <div className="flex">
        <Sidebar />
        <main className="ml-72 flex-1 p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
          <div className="mb-6">
            <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
              <button type="button" className="hover:text-slate-700" onClick={() => setSelectedDriver(null)}>
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
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-600">Datum do</label>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button type="button" onClick={handleFilterDates} disabled={ridesLoading} className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
                  {ridesLoading ? 'Filtriram...' : 'Filtriraj'}
                </button>
                <button type="button" onClick={handleResetFilter} disabled={ridesLoading} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-60" aria-label="Ponastavi obdobje">
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
                  <p className="mt-1 text-sm text-slate-500">Izdelano: {new Date().toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
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
                  <p>Prikazano {ridesStartRow}-{ridesEndRow} od {rides.length} rezultatov</p>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button type="button" onClick={() => setRidesPage((p) => Math.max(1, p - 1))} disabled={ridesPage === 1} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Prejšnja stran voženj">
                      <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                    <button type="button" onClick={() => setRidesPage((p) => Math.min(ridesTotalPages, p + 1))} disabled={ridesPage >= ridesTotalPages} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Naslednja stran voženj">
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Hidden PDF template */}
          <div className="fixed -left-[99999px] top-0 z-[-1]">
            <section ref={pdfTemplateRef} className="w-[1120px] bg-white px-[64px] py-[58px] text-[#0f172a]" style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}>
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
                        <td className="px-6 py-4"><p>{formatDateCompact(ride.datum || ride.zacetek)}</p></td>
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
                  <p className="text-slate-600">Skupaj voženj: <span className="font-bold text-slate-900">{rides.length}</span></p>
                  <p className="text-slate-600">Skupaj ur: <span className="font-bold text-slate-900">{totalRideDurationLabel}</span></p>
                </div>
                <p className="mt-6 text-center text-[20px] text-slate-500">Stran 1 / 1</p>
              </footer>
            </section>
          </div>
        </main>
      </div>
    );
  }

  // ── Main list + calendar view ────────────────────────────────────────────
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
              onClick={() => { fetchVozniki(); fetchUrnik(); }}
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

        {/* Stat card */}
        <section className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Skupaj voznikov</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="material-symbols-outlined rounded-lg bg-blue-50 p-2 text-blue-600">group</span>
              <p className="text-2xl font-bold text-slate-900">{vozniki.length}</p>
            </div>
          </article>
        </section>

        {/* Drivers table */}
        {loading && !vozniki.length ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-500 shadow-sm">
            Nalaganje voznikov...
          </div>
        ) : vozniki.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-500 shadow-sm">
            Ni registriranih voznikov
          </div>
        ) : (
          <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm mb-6">
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
                          voznik.dostop === 2 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'
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
              <p>Prikazano {startRow}-{endRow} od {vozniki.length} voznikov</p>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Prejšnja stran">
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-blue-600 px-2 text-xs font-semibold text-white">
                  {currentPage}
                </span>
                <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Naslednja stran">
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Calendar */}
        {urnikLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-500 shadow-sm">
            Nalaganje urnika...
          </div>
        ) : (
          <DriversCalendar urnik={urnik} vozniki={vozniki} />
        )}
      </main>
    </div>
  );
}