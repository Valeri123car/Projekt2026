import React, { useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api/client';

const ITEMS_PER_PAGE = 8;

const DOSTOP_OPTIONS = [
  { value: 1, label: 'VOZNIK', color: 'bg-emerald-100 text-emerald-700' },
  { value: 2, label: 'ADMIN', color: 'bg-amber-100 text-amber-800' },
  { value: 3, label: 'STRANKA', color: 'bg-slate-100 text-slate-600' },
];

const getDostopMeta = (dostop) =>
  DOSTOP_OPTIONS.find((o) => o.value === dostop) ?? DOSTOP_OPTIONS[0];

// ─── Modal ──────────────────────────────────────────────────────────────────
function UporabnikModal({ mode, user, onClose, onSaved }) {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState({
    ime: user?.ime ?? '',
    priimek: user?.priimek ?? '',
    email: user?.email ?? '',
    geslo: '',
    dostop: user?.dostop ?? 1,
    emso: '',
    gdpr_soglasje: user?.gdpr_soglasje ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!form.ime.trim() || !form.priimek.trim() || !form.email.trim()) {
      setError('Ime, priimek in e-pošta so obvezna polja.');
      return;
    }
    if (!isEdit && form.geslo.length < 6) {
      setError('Geslo mora imeti vsaj 6 znakov.');
      return;
    }
    try {
      setSaving(true);
      if (isEdit) {
        const body = {
          ime: form.ime,
          priimek: form.priimek,
          email: form.email,
          dostop: Number(form.dostop),
          gdpr_soglasje: form.gdpr_soglasje,
        };
        if (form.geslo) body.geslo = form.geslo;
        if (form.emso) body.emso = form.emso;
        await api.put(`/admin/uporabniki/${user.id_uporabnik}`, body);
      } else {
        await api.post('/admin/uporabniki', {
          ime: form.ime,
          priimek: form.priimek,
          email: form.email,
          geslo: form.geslo,
          dostop: Number(form.dostop),
          emso: form.emso || undefined,
          gdpr_soglasje: form.gdpr_soglasje,
        });
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error ?? 'Prišlo je do napake.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined rounded-lg bg-blue-50 p-2 text-blue-600">
              {isEdit ? 'manage_accounts' : 'person_add'}
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {isEdit ? 'Uredi uporabnika' : 'Nov uporabnik'}
              </h2>
              {isEdit && (
                <p className="text-xs text-slate-500">ID: {user.id_uporabnik}</p>
              )}
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

        {/* Body */}
        <div className="space-y-4 px-6 py-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Ime *</label>
              <input
                value={form.ime}
                onChange={set('ime')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Priimek *</label>
              <input
                value={form.priimek}
                onChange={set('priimek')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">E-pošta *</label>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              {isEdit ? 'Novo geslo (pustite prazno, če ne menjate)' : 'Geslo *'}
            </label>
            <input
              type="password"
              value={form.geslo}
              onChange={set('geslo')}
              placeholder={isEdit ? '••••••' : 'Min. 6 znakov'}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Vloga / Dostop *</label>
              <select
                value={form.dostop}
                onChange={set('dostop')}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DOSTOP_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">EMŠO (šifrirano)</label>
              <input
                value={form.emso}
                onChange={set('emso')}
                placeholder="Neobvezno"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.gdpr_soglasje}
              onChange={set('gdpr_soglasje')}
              className="h-4 w-4 rounded border-slate-300 accent-blue-600"
            />
            GDPR soglasje
          </label>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Prekliči
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[16px]">save</span>
            {saving ? 'Shranjujem...' : isEdit ? 'Shrani spremembe' : 'Ustvari uporabnika'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm ──────────────────────────────────────────────────────────
function DeleteModal({ user, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await api.delete(`/admin/uporabniki/${user.id_uporabnik}`);
      onDeleted();
    } catch (err) {
      setError(err.response?.data?.error ?? 'Brisanje ni uspelo.');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="px-6 pt-6 pb-4">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <span className="material-symbols-outlined text-red-600">delete_forever</span>
          </div>
          <h2 className="text-base font-semibold text-slate-900">Izbriši uporabnika</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ste prepričani, da želite izbrisati{' '}
            <span className="font-medium text-slate-800">
              {user.ime} {user.priimek}
            </span>
            ? To dejanje je nepopravljivo.
          </p>
          {error && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Prekliči
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
            {deleting ? 'Brišem...' : 'Izbriši'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Uporabniki() {
  const [uporabniki, setUporabniki] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDostop, setFilterDostop] = useState('vse');

  const [modal, setModal] = useState(null); // { type: 'add' | 'edit' | 'delete', user? }

  const fetchUporabniki = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/admin/uporabniki');
      setUporabniki(response.data);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Napaka pri nalaganju uporabnikov');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUporabniki();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterDostop]);

  const filtered = useMemo(() => {
    return uporabniki.filter((u) => {
      const matchSearch =
        !searchQuery ||
        `${u.ime} ${u.priimek} ${u.email}`.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDostop =
        filterDostop === 'vse' || String(u.dostop) === filterDostop;
      return matchSearch && matchDostop;
    });
  }, [uporabniki, searchQuery, filterDostop]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const startRow = filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endRow = Math.min(currentPage * ITEMS_PER_PAGE, filtered.length);

  // Stats
  const statsByDostop = useMemo(() => {
    return DOSTOP_OPTIONS.map((o) => ({
      ...o,
      count: uporabniki.filter((u) => u.dostop === o.value).length,
    }));
  }, [uporabniki]);

  const formatDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('sl-SI', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleSaved = () => {
    setModal(null);
    fetchUporabniki();
  };

  const handleDeleted = () => {
    setModal(null);
    fetchUporabniki();
  };

  return (
    <div className="flex">
      <Sidebar />

      {/* Modals */}
      {modal?.type === 'add' && (
        <UporabnikModal
          mode="add"
          user={null}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
      {modal?.type === 'edit' && (
        <UporabnikModal
          mode="edit"
          user={modal.user}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
      {modal?.type === 'delete' && (
        <DeleteModal
          user={modal.user}
          onClose={() => setModal(null)}
          onDeleted={handleDeleted}
        />
      )}

      <main className="ml-72 flex-1 p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
        {/* Page header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Uporabniki</h1>
            <p className="text-slate-500 mt-1">Upravljanje z vsemi uporabniki sistema</p>
          </div>
          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              type="button"
              onClick={fetchUporabniki}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              {loading ? 'Osvežujem...' : 'Osveži'}
            </button>
            <button
              type="button"
              onClick={() => setModal({ type: 'add' })}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              Nov uporabnik
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Stats */}
        <section className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Skupaj</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="material-symbols-outlined rounded-lg bg-blue-50 p-2 text-blue-600">group</span>
              <p className="text-2xl font-bold text-slate-900">{uporabniki.length}</p>
            </div>
          </article>
          {statsByDostop.map((s) => (
            <article key={s.value} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
              <div className="mt-3 flex items-center gap-3">
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${s.color}`}>
                  {s.count}
                </span>
                <p className="text-2xl font-bold text-slate-900">{s.count}</p>
              </div>
            </article>
          ))}
        </section>

        {/* Filters */}
        <section className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
              search
            </span>
            <input
              type="text"
              placeholder="Iskanje po imenu ali e-pošti…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500 whitespace-nowrap">Vloga:</label>
            <select
              value={filterDostop}
              onChange={(e) => setFilterDostop(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="vse">Vse</option>
              {DOSTOP_OPTIONS.map((o) => (
                <option key={o.value} value={String(o.value)}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Table */}
        {loading && !uporabniki.length ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-500 shadow-sm">
            Nalaganje uporabnikov…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-500 shadow-sm">
            {uporabniki.length === 0 ? 'Ni registriranih uporabnikov' : 'Ni rezultatov za iskanje'}
          </div>
        ) : (
          <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse">
                <thead className="bg-slate-100">
                  <tr className="text-left text-xs font-semibold tracking-wide text-slate-600 uppercase">
                    <th className="px-5 py-4">Uporabnik</th>
                    <th className="px-4 py-4">ID</th>
                    <th className="px-4 py-4">E-pošta</th>
                    <th className="px-4 py-4">Vloga</th>
                    <th className="px-4 py-4">GDPR</th>
                    <th className="px-4 py-4">GDPR datum</th>
                    <th className="px-5 py-4 text-right">Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((u) => {
                    const meta = getDostopMeta(u.dostop);
                    return (
                      <tr key={u.id_uporabnik} className="border-t border-slate-200 hover:bg-slate-50/80">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined rounded-lg bg-blue-50 p-2 text-blue-600">person</span>
                            <p className="font-medium text-slate-900">{u.ime} {u.priimek}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-500 text-sm">{u.id_uporabnik}</td>
                        <td className="px-4 py-4 text-slate-700 text-sm">{u.email}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide ${meta.color}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`material-symbols-outlined text-[20px] ${
                              u.gdpr_soglasje ? 'text-emerald-500' : 'text-slate-300'
                            }`}
                          >
                            {u.gdpr_soglasje ? 'check_circle' : 'cancel'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-500 text-sm">{formatDate(u.gdpr_datum)}</td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              className="inline-flex items-center rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              aria-label={`Uredi ${u.ime} ${u.priimek}`}
                              onClick={() => setModal({ type: 'edit', user: u })}
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                              aria-label={`Izbriši ${u.ime} ${u.priimek}`}
                              onClick={() => setModal({ type: 'delete', user: u })}
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Prikazano {startRow}–{endRow} od {filtered.length} uporabnikov
                {filtered.length !== uporabniki.length && (
                  <span className="ml-1 text-slate-400">(filtrirano iz {uporabniki.length})</span>
                )}
              </p>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Prejšnja stran"
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
