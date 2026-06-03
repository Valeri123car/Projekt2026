import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api/client';

const ITEMS_PER_PAGE = 8;

// ─── Modal ──────────────────────────────────────────────────────────────────
function VoziloModal({ mode, vozilo, tipiVozil, onClose, onSaved }) {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState({
    registerska: vozilo?.registerska ?? '',
    st_sedezev: vozilo?.st_sedezev ?? '',
    dolzina: vozilo?.dolzina ?? '',
    fk_tip_vozila: vozilo?.fk_tip_vozila ?? (tipiVozil[0]?.id_tip_vozila ?? ''),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async () => {
    setError(null);
    if (!form.registerska.trim()) {
      setError('Registrska oznaka je obvezna.');
      return;
    }
    if (!form.st_sedezev || Number(form.st_sedezev) < 1) {
      setError('Število sedežev mora biti vsaj 1.');
      return;
    }
    if (!form.fk_tip_vozila) {
      setError('Izberite tip vozila.');
      return;
    }
    const body = {
      registerska: form.registerska.trim().toUpperCase(),
      st_sedezev: Number(form.st_sedezev),
      fk_tip_vozila: Number(form.fk_tip_vozila),
    };
    if (form.dolzina) body.dolzina = Number(form.dolzina);

    try {
      setSaving(true);
      if (isEdit) {
        await api.put(`/vozila/${vozilo.id_vozilo}`, body);
      } else {
        await api.post('/vozila', body);
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
              {isEdit ? 'directions_car' : 'add_circle'}
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {isEdit ? 'Uredi vozilo' : 'Novo vozilo'}
              </h2>
              {isEdit && (
                <p className="text-xs text-slate-500">ID: {vozilo.id_vozilo}</p>
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

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Registrska oznaka *</label>
            <input
              value={form.registerska}
              onChange={set('registerska')}
              placeholder="npr. LJ 12-34E"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Tip vozila *</label>
            <select
              value={form.fk_tip_vozila}
              onChange={set('fk_tip_vozila')}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {tipiVozil.map((t) => (
                <option key={t.id_tip_vozila} value={t.id_tip_vozila}>
                  {t.naziv}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Število sedežev *</label>
              <input
                type="number"
                min="1"
                value={form.st_sedezev}
                onChange={set('st_sedezev')}
                placeholder="npr. 50"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Dolžina (m)</label>
              <input
                type="number"
                min="1"
                value={form.dolzina}
                onChange={set('dolzina')}
                placeholder="Neobvezno"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
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
            {saving ? 'Shranjujem...' : isEdit ? 'Shrani spremembe' : 'Dodaj vozilo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tipi Vozil Manager ──────────────────────────────────────────────────────
function TipiVozilModal({ tipiVozil, onClose, onChanged }) {
  const [list, setList] = useState(tipiVozil);
  const [newNaziv, setNewNaziv] = useState('');
  const [editId, setEditId] = useState(null);
  const [editNaziv, setEditNaziv] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleAdd = async () => {
    if (!newNaziv.trim()) return;
    setError(null);
    try {
      setSaving(true);
      const res = await api.post('/tipi-vozil', { naziv: newNaziv.trim() });
      const updated = [...list, res.data].sort((a, b) => a.naziv.localeCompare(b.naziv));
      setList(updated);
      setNewNaziv('');
      onChanged(updated);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Dodajanje ni uspelo.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (id) => {
    if (!editNaziv.trim()) return;
    setError(null);
    try {
      setSaving(true);
      await api.put(`/tipi-vozil/${id}`, { naziv: editNaziv.trim() });
      const updated = list
        .map((t) => (t.id_tip_vozila === id ? { ...t, naziv: editNaziv.trim() } : t))
        .sort((a, b) => a.naziv.localeCompare(b.naziv));
      setList(updated);
      setEditId(null);
      setEditNaziv('');
      onChanged(updated);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Urejanje ni uspelo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setError(null);
    try {
      setSaving(true);
      await api.delete(`/tipi-vozil/${id}`);
      const updated = list.filter((t) => t.id_tip_vozila !== id);
      setList(updated);
      onChanged(updated);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Brisanje ni uspelo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined rounded-lg bg-slate-100 p-2 text-slate-600">
              category
            </span>
            <h2 className="text-base font-semibold text-slate-900">Tipi vozil</h2>
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
        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Add new */}
          <div className="flex gap-2">
            <input
              value={newNaziv}
              onChange={(e) => setNewNaziv(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Naziv novega tipa…"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving || !newNaziv.trim()}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Dodaj
            </button>
          </div>

          {/* List */}
          {list.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">Ni tipov vozil.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {list.map((tip) => (
                <li key={tip.id_tip_vozila} className="flex items-center gap-2 py-2">
                  {editId === tip.id_tip_vozila ? (
                    <>
                      <input
                        value={editNaziv}
                        onChange={(e) => setEditNaziv(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleEdit(tip.id_tip_vozila)}
                        autoFocus
                        className="flex-1 rounded-lg border border-blue-400 px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleEdit(tip.id_tip_vozila)}
                        disabled={saving}
                        className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50"
                        aria-label="Shrani"
                      >
                        <span className="material-symbols-outlined text-[18px]">check</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditId(null); setEditNaziv(''); }}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
                        aria-label="Prekliči"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-slate-800">{tip.naziv}</span>
                      <button
                        type="button"
                        onClick={() => { setEditId(tip.id_tip_vozila); setEditNaziv(tip.naziv); }}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label={`Uredi ${tip.naziv}`}
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(tip.id_tip_vozila)}
                        disabled={saving}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        aria-label={`Izbriši ${tip.naziv}`}
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Zapri
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm ──────────────────────────────────────────────────────────
function DeleteModal({ vozilo, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await api.delete(`/vozila/${vozilo.id_vozilo}`);
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
          <h2 className="text-base font-semibold text-slate-900">Izbriši vozilo</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ste prepričani, da želite izbrisati vozilo{' '}
            <span className="font-medium text-slate-800">{vozilo.registerska}</span>? To dejanje je nepopravljivo.
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
export default function Vozila() {
  const [vozila, setVozila] = useState([]);
  const [tipiVozil, setTipiVozil] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTip, setFilterTip] = useState('vse');

  const [modal, setModal] = useState(null); // { type: 'add' | 'edit' | 'delete', vozilo? }
  const [showTipiModal, setShowTipiModal] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [vozilaRes, tipiRes] = await Promise.all([
        api.get('/vozila'),
        api.get('/tipi-vozil'),
      ]);
      setVozila(vozilaRes.data);
      setTipiVozil(tipiRes.data);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Napaka pri nalaganju podatkov.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterTip]);

  const filtered = useMemo(() => {
    return vozila.filter((v) => {
      const matchSearch =
        !searchQuery || v.registerska.toLowerCase().includes(searchQuery.toLowerCase());
      const matchTip =
        filterTip === 'vse' || String(v.fk_tip_vozila) === filterTip;
      return matchSearch && matchTip;
    });
  }, [vozila, searchQuery, filterTip]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const startRow = filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endRow = Math.min(currentPage * ITEMS_PER_PAGE, filtered.length);

  const handleSaved = () => {
    setModal(null);
    fetchData();
  };

  const handleDeleted = () => {
    setModal(null);
    fetchData();
  };

  return (
    <div className="flex">
      <Sidebar />

      {/* Tipi vozil modal */}
      {showTipiModal && (
        <TipiVozilModal
          tipiVozil={tipiVozil}
          onClose={() => setShowTipiModal(false)}
          onChanged={(updated) => setTipiVozil(updated)}
        />
      )}

      {/* Modals */}
      {modal?.type === 'add' && (
        <VoziloModal
          mode="add"
          vozilo={null}
          tipiVozil={tipiVozil}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
      {modal?.type === 'edit' && (
        <VoziloModal
          mode="edit"
          vozilo={modal.vozilo}
          tipiVozil={tipiVozil}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
      {modal?.type === 'delete' && (
        <DeleteModal
          vozilo={modal.vozilo}
          onClose={() => setModal(null)}
          onDeleted={handleDeleted}
        />
      )}

      <main className="ml-72 flex-1 p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
        {/* Page header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Vozila</h1>
            <p className="text-slate-500 mt-1">Upravljanje z voznim parkom</p>
          </div>
          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              {loading ? 'Osvežujem...' : 'Osveži'}
            </button>
            <button
              type="button"
              onClick={() => setShowTipiModal(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <span className="material-symbols-outlined text-[18px]">category</span>
              Tipi vozil
            </button>
            <button
              type="button"
              onClick={() => setModal({ type: 'add' })}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Novo vozilo
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
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Skupaj vozil</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="material-symbols-outlined rounded-lg bg-blue-50 p-2 text-blue-600">directions_bus</span>
              <p className="text-2xl font-bold text-slate-900">{vozila.length}</p>
            </div>
          </article>
          {tipiVozil.slice(0, 3).map((tip) => {
            const count = vozila.filter((v) => v.fk_tip_vozila === tip.id_tip_vozila).length;
            return (
              <article key={tip.id_tip_vozila} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{tip.naziv}</p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="material-symbols-outlined rounded-lg bg-slate-100 p-2 text-slate-600">directions_car</span>
                  <p className="text-2xl font-bold text-slate-900">{count}</p>
                </div>
              </article>
            );
          })}
        </section>

        {/* Filters */}
        <section className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
              search
            </span>
            <input
              type="text"
              placeholder="Iskanje po registrski oznaki…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500 whitespace-nowrap">Tip:</label>
            <select
              value={filterTip}
              onChange={(e) => setFilterTip(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="vse">Vsi tipi</option>
              {tipiVozil.map((t) => (
                <option key={t.id_tip_vozila} value={String(t.id_tip_vozila)}>
                  {t.naziv}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Table */}
        {loading && !vozila.length ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-500 shadow-sm">
            Nalaganje vozil…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-500 shadow-sm">
            {vozila.length === 0 ? 'Ni registriranih vozil' : 'Ni rezultatov za iskanje'}
          </div>
        ) : (
          <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead className="bg-slate-100">
                  <tr className="text-left text-xs font-semibold tracking-wide text-slate-600 uppercase">
                    <th className="px-5 py-4">Vozilo</th>
                    <th className="px-4 py-4">Tip vozila</th>
                    <th className="px-4 py-4">Sedeži</th>
                    <th className="px-4 py-4">Dolžina (m)</th>
                    <th className="px-5 py-4 text-right">Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((v) => (
                    <tr key={v.id_vozilo} className="border-t border-slate-200 hover:bg-slate-50/80">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined rounded-lg bg-blue-50 p-2 text-blue-600">
                            directions_car
                          </span>
                          <div>
                            <p className="font-semibold text-slate-900">{v.registerska}</p>
                            <p className="text-xs text-slate-400">ID: {v.id_vozilo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold tracking-wide text-slate-700">
                          {v.tip_vozila?.naziv ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-700 text-sm">{v.st_sedezev}</td>
                      <td className="px-4 py-4 text-slate-500 text-sm">{v.dolzina ?? '—'}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            className="inline-flex items-center rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            aria-label={`Uredi ${v.registerska}`}
                            onClick={() => setModal({ type: 'edit', vozilo: v })}
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                            aria-label={`Izbriši ${v.registerska}`}
                            onClick={() => setModal({ type: 'delete', vozilo: v })}
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Prikazano {startRow}–{endRow} od {filtered.length} vozil
                {filtered.length !== vozila.length && (
                  <span className="ml-1 text-slate-400">(filtrirano iz {vozila.length})</span>
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
