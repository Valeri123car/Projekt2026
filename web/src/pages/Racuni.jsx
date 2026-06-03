import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api/client';

const ITEMS_PER_PAGE = 10;

const fmt = {
  date: (v) => v ? new Date(v).toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-',
  currency: (v) => v == null ? '-' : new Intl.NumberFormat('sl-SI', { style: 'currency', currency: 'EUR' }).format(v),
};

function SortIcon({ active, dir }) {
  if (!active) return <span className="material-symbols-outlined text-[14px] text-slate-300">unfold_more</span>;
  return <span className="material-symbols-outlined text-[14px] text-blue-600">{dir === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>;
}

export default function Racuni() {
  const [urnik, setUrnik] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStranka, setFilterStranka] = useState('vse');
  const [filterPlacano, setFilterPlacano] = useState('vse');
  const [filterOd, setFilterOd] = useState('');
  const [filterDo, setFilterDo] = useState('');
  const [sortField, setSortField] = useState('datum');
  const [sortDir, setSortDir] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchUrnik = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/admin/urnik');
      setUrnik(res.data || []);
    } catch (e) {
      setError(e.response?.data?.error || 'Napaka pri nalaganju podatkov.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUrnik(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterStranka, filterPlacano, filterOd, filterDo, sortField, sortDir]);

  const togglePlacano = async (item) => {
    try {
      setTogglingId(item.id_urnik);
      await api.patch(`/admin/urnik/${item.id_urnik}/placano`, { placano: !item.placano });
      setUrnik((prev) => prev.map((u) => u.id_urnik === item.id_urnik ? { ...u, placano: !u.placano } : u));
    } catch {
      setError('Napaka pri posodabljanju statusa plačila.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  // Unique stranke for dropdown
  const strankeOptions = useMemo(() => {
    const map = new Map();
    urnik.forEach((u) => {
      if (u.stranka) map.set(u.stranka.id_stranka, u.stranka.naziv);
    });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [urnik]);

  const filtered = useMemo(() => {
    let data = [...urnik];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter((u) =>
        (u.naziv ?? '').toLowerCase().includes(q) ||
        (u.stranka?.naziv ?? '').toLowerCase().includes(q)
      );
    }
    if (filterStranka !== 'vse') data = data.filter((u) => String(u.fk_stranka) === filterStranka);
    if (filterPlacano === 'placano')   data = data.filter((u) =>  u.placano);
    if (filterPlacano === 'neplacano') data = data.filter((u) => !u.placano);
    if (filterOd) data = data.filter((u) => new Date(u.datum) >= new Date(filterOd));
    if (filterDo) data = data.filter((u) => new Date(u.datum) <= new Date(filterDo + 'T23:59:59'));

    data.sort((a, b) => {
      let av, bv;
      if (sortField === 'datum')    { av = new Date(a.datum); bv = new Date(b.datum); }
      else if (sortField === 'stranka') { av = a.stranka?.naziv ?? ''; bv = b.stranka?.naziv ?? ''; }
      else if (sortField === 'cena')    { av = a.cena ?? -1; bv = b.cena ?? -1; }
      else if (sortField === 'placano') { av = a.placano ? 1 : 0; bv = b.placano ? 1 : 0; }
      else { av = a[sortField] ?? ''; bv = b[sortField] ?? ''; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
    return data;
  }, [urnik, searchQuery, filterStranka, filterPlacano, filterOd, filterDo, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const startRow = filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endRow   = Math.min(currentPage * ITEMS_PER_PAGE, filtered.length);

  // Stats
  const stats = useMemo(() => {
    const withCena = urnik.filter((u) => u.cena != null);
    return {
      skupaj:      urnik.length,
      placanoCount: urnik.filter((u) =>  u.placano).length,
      neplacanoCount: urnik.filter((u) => !u.placano).length,
      skupajCena:  withCena.reduce((s, u) => s + u.cena, 0),
      placanoSum:  withCena.filter((u) =>  u.placano).reduce((s, u) => s + u.cena, 0),
      neplacanoSum: withCena.filter((u) => !u.placano).reduce((s, u) => s + u.cena, 0),
    };
  }, [urnik]);

  // Per-stranka summary (for active filter only — shown when no stranka is filtered)
  const strankaSummary = useMemo(() => {
    const map = new Map();
    urnik.forEach((u) => {
      const key = u.fk_stranka;
      if (!key) return;
      if (!map.has(key)) map.set(key, { naziv: u.stranka?.naziv ?? '—', skupaj: 0, placano: 0, neplacano: 0, vsota: 0, neplacanoVsota: 0 });
      const s = map.get(key);
      s.skupaj++;
      if (u.placano) { s.placano++; if (u.cena) s.vsota += u.cena; }
      else { s.neplacano++; if (u.cena) s.neplacanoVsota += u.cena; }
    });
    return [...map.values()].sort((a, b) => b.neplacanoVsota - a.neplacanoVsota);
  }, [urnik]);

  const Th = ({ field, label }) => (
    <th
      className="px-4 py-4 cursor-pointer hover:text-slate-900"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <SortIcon active={sortField === field} dir={sortDir} />
      </div>
    </th>
  );

  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-72 flex-1 p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">

        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Računi</h1>
            <p className="text-slate-500 mt-1">Pregled plačil po prevozih in strankah</p>
          </div>
          <button
            type="button"
            onClick={fetchUrnik}
            disabled={loading}
            className="self-start md:self-auto inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            {loading ? 'Osvežujem...' : 'Osveži'}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Stats */}
        <section className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Skupaj prevozov</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="material-symbols-outlined rounded-lg bg-blue-50 p-2 text-blue-600">receipt_long</span>
              <p className="text-2xl font-bold text-slate-900">{stats.skupaj}</p>
            </div>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Skupaj vrednost</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="material-symbols-outlined rounded-lg bg-amber-50 p-2 text-amber-600">euro</span>
              <p className="text-2xl font-bold text-slate-900">{fmt.currency(stats.skupajCena)}</p>
            </div>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plačano</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="material-symbols-outlined rounded-lg bg-emerald-50 p-2 text-emerald-600">check_circle</span>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.placanoCount}</p>
                <p className="text-xs text-slate-400">{fmt.currency(stats.placanoSum)}</p>
              </div>
            </div>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Neplačano</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="material-symbols-outlined rounded-lg bg-red-50 p-2 text-red-500">cancel</span>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.neplacanoCount}</p>
                <p className="text-xs text-red-400">{fmt.currency(stats.neplacanoSum)}</p>
              </div>
            </div>
          </article>
        </section>

        {/* Per-stranka summary */}
        {strankaSummary.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Po strankah</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {strankaSummary.map((s) => (
                <button
                  key={s.naziv}
                  type="button"
                  onClick={() => setFilterStranka(
                    filterStranka === String([...strankaSummary].find((x) => x.naziv === s.naziv))
                      ? 'vse'
                      : String(urnik.find((u) => u.stranka?.naziv === s.naziv)?.fk_stranka ?? 'vse')
                  )}
                  className="text-left rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
                >
                  <p className="font-semibold text-slate-800 truncate">{s.naziv}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                    <span>{s.skupaj} prevozov</span>
                    {s.neplacano > 0 && (
                      <span className="font-semibold text-red-500">{s.neplacano} neplačanih · {fmt.currency(s.neplacanoVsota)}</span>
                    )}
                    {s.neplacano === 0 && (
                      <span className="font-semibold text-emerald-600">Vse plačano</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Filters */}
        <section className="mb-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
            <input
              type="text"
              placeholder="Iskanje po stranki ali relaciji…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterStranka}
            onChange={(e) => setFilterStranka(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="vse">Vse stranke</option>
            {strankeOptions.map(([id, naziv]) => (
              <option key={id} value={String(id)}>{naziv}</option>
            ))}
          </select>

          <select
            value={filterPlacano}
            onChange={(e) => setFilterPlacano(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="vse">Vse</option>
            <option value="placano">Plačano</option>
            <option value="neplacano">Neplačano</option>
          </select>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 whitespace-nowrap">Od:</label>
            <input
              type="date"
              value={filterOd}
              onChange={(e) => setFilterOd(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 whitespace-nowrap">Do:</label>
            <input
              type="date"
              value={filterDo}
              onChange={(e) => setFilterDo(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {(searchQuery || filterStranka !== 'vse' || filterPlacano !== 'vse' || filterOd || filterDo) && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setFilterStranka('vse'); setFilterPlacano('vse'); setFilterOd(''); setFilterDo(''); }}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
              Počisti
            </button>
          )}
        </section>

        {/* Table */}
        {loading && !urnik.length ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-500 shadow-sm">
            Nalaganje…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-500 shadow-sm">
            {urnik.length === 0 ? 'Ni prevozov' : 'Ni rezultatov za iskanje'}
          </div>
        ) : (
          <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead className="bg-slate-100">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <Th field="datum"    label="Datum" />
                    <Th field="stranka"  label="Stranka" />
                    <th className="px-4 py-4">Relacija / Naziv</th>
                    <th className="px-4 py-4">Voznik</th>
                    <Th field="cena"     label="Cena" />
                    <Th field="placano"  label="Status" />
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((u) => (
                    <tr key={u.id_urnik} className="border-t border-slate-200 hover:bg-slate-50/80">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined rounded-lg bg-slate-100 p-2 text-slate-500">calendar_today</span>
                          <p className="text-sm font-medium text-slate-900">{fmt.date(u.datum)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-800">{u.stranka?.naziv ?? '-'}</p>
                        {u.stranka?.telefonska && <p className="text-xs text-slate-400">{u.stranka.telefonska}</p>}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600 max-w-[180px] truncate">
                        {u.naziv || '-'}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {u.uporabnik ? `${u.uporabnik.ime} ${u.uporabnik.priimek}` : '-'}
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-800">
                        {fmt.currency(u.cena)}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => togglePlacano(u)}
                          disabled={togglingId === u.id_urnik}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold border transition-colors disabled:opacity-60 ${
                            u.placano
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {togglingId === u.id_urnik ? 'sync' : u.placano ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                          {u.placano ? 'Plačano' : 'Neplačano'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination + totals */}
            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span>
                  Prikazano {startRow}–{endRow} od {filtered.length}
                  {filtered.length !== urnik.length && <span className="ml-1 text-slate-400">(filtrirano iz {urnik.length})</span>}
                </span>
                {filtered.some((u) => u.cena != null) && (
                  <span className="ml-3 font-semibold text-slate-700">
                    Vsota: {fmt.currency(filtered.filter((u) => u.cena != null).reduce((s, u) => s + u.cena, 0))}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-blue-600 px-2 text-xs font-semibold text-white">
                  {currentPage}
                </span>
                <span className="text-xs text-slate-400">/ {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
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
