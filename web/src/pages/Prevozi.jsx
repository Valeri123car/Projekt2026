import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api/client';

const ITEMS_PER_PAGE = 10;

const formatDate = (v) => {
  if (!v) return '-';
  return new Date(v).toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatCas = (v) => {
  if (!v) return '-';
  return new Date(v).toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' });
};

const formatCena = (v) => {
  if (v == null) return '-';
  return new Intl.NumberFormat('sl-SI', { style: 'currency', currency: 'EUR' }).format(v);
};

const toInputDate = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const toInputTime = (v) => {
  if (!v) return '08:00';
  const d = new Date(v);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function buildTimestamps(datum, uraZacetek, uraKonec) {
  const [hz, mz] = uraZacetek.split(':');
  const [hk, mk] = uraKonec.split(':');
  const zacetek = `${datum}T${hz.padStart(2, '0')}:${mz.padStart(2, '0')}:00`;
  const zacMs = parseInt(hz) * 60 + parseInt(mz);
  const koncMs = parseInt(hk) * 60 + parseInt(mk);
  const koncDatum = koncMs <= zacMs
    ? new Date(new Date(datum).getTime() + 86400000).toISOString().split('T')[0]
    : datum;
  return { zacetek, konc: `${koncDatum}T${hk.padStart(2, '0')}:${mk.padStart(2, '0')}:00` };
}

function validatePrevoz(datum, selectedVoznik) {
  if (!datum) return 'Datum je obvezen.';
  if (!selectedVoznik) return 'Izberite voznika.';
  return null;
}

function buildPrevozPayload(fields) {
  const { datum, uraZacetek, uraKonec, relacija, opis, cena, placano, selectedVozilo, selectedStranka, selectedVoznik } = fields;
  const { zacetek, konc } = buildTimestamps(datum, uraZacetek, uraKonec);
  return {
    datum,
    zacetek,
    konc,
    relacija:     relacija    || undefined,
    opis:         opis        || undefined,
    cena:         cena !== '' ? parseFloat(cena) : undefined,
    placano,
    fk_vozilo:    selectedVozilo  ? parseInt(selectedVozilo)  : undefined,
    fk_stranka:   selectedStranka ? parseInt(selectedStranka) : undefined,
    fk_uporabnik: parseInt(selectedVoznik),
  };
}

function useOverlapCheck(datum, uraZacetek, uraKonec, isEdit, prevozId) {
  const [zasedeniVozniki, setZasedeniVozniki] = useState([]);
  const [zasedeniVozila, setZasedeniVozila]   = useState([]);

  useEffect(() => {
    if (!datum) {
      setZasedeniVozniki([]);
      setZasedeniVozila([]);
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return;

    const check = async () => {
      try {
        const params = new URLSearchParams({ od: datum, do: datum });
        const res = await api.get(`/admin/voznje?${params.toString()}`);
        const prevozi = (res.data || []).filter((p) =>
          isEdit ? p.id_voznja !== prevozId : true
        );
        const [hz, mz] = uraZacetek.split(':');
        const [hk, mk] = uraKonec.split(':');
        const zacMs = parseInt(hz) * 60 + parseInt(mz);
        const koncMs = parseInt(hk) * 60 + parseInt(mk);
        const newZac  = new Date(`${datum}T${uraZacetek}:00`);
        const newKonc = new Date(`${datum}T${uraKonec}:00`);
        if (koncMs <= zacMs) newKonc.setDate(newKonc.getDate() + 1);
        const overlaps = (p) => new Date(p.zacetek) < newKonc && new Date(p.konc) > newZac;
        setZasedeniVozniki(prevozi.filter(overlaps).map((p) => p.fk_uporabnik));
        setZasedeniVozila(prevozi.filter(overlaps).filter((p) => p.fk_vozilo).map((p) => p.fk_vozilo));
      } catch { /* ignore */ }
    };
    check();
  }, [datum, uraZacetek, uraKonec, isEdit, prevozId]);

  return { zasedeniVozniki, zasedeniVozila };
}

function SelectionGrid({ items, selectedId, zasedeni, onSelect, deselectable, renderItem }) {
  return (
    <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
      {items.map((item) => {
        const id       = String(item.id);
        const zaseden  = zasedeni.includes(item.rawId);
        const selected = selectedId === id;
        const colorClass = selected && zaseden
          ? 'border-orange-400 bg-orange-50 text-orange-900'
          : selected
          ? 'border-blue-500 bg-blue-50 text-blue-800'
          : zaseden
          ? 'border-yellow-300 bg-yellow-50 hover:border-yellow-400'
          : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40';
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(deselectable && selected ? '' : id)}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${colorClass}`}
          >
            {renderItem(item, selected, zaseden)}
          </button>
        );
      })}
    </div>
  );
}

function NovaStrankaForm({ data, onChange, onSave, saving }) {
  return (
    <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
      <p className="text-xs font-semibold text-blue-700">Nova stranka</p>
      <input
        value={data.naziv}
        onChange={(e) => onChange((d) => ({ ...d, naziv: e.target.value }))}
        placeholder="Naziv *"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          value={data.telefonska}
          onChange={(e) => onChange((d) => ({ ...d, telefonska: e.target.value }))}
          placeholder="Telefonska"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          value={data.email}
          onChange={(e) => onChange((d) => ({ ...d, email: e.target.value }))}
          placeholder="E-pošta"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <input
        value={data.davcna_st}
        onChange={(e) => onChange((d) => ({ ...d, davcna_st: e.target.value }))}
        placeholder="Davčna številka"
        type="number"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="button"
        disabled={saving || !data.naziv.trim()}
        onClick={onSave}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {saving ? 'Shranjujem...' : 'Ustvari stranko'}
      </button>
    </div>
  );
}

function PrevozModal({ mode, prevoz, onClose, onSaved }) {
  const isEdit = mode === 'edit';

  const [datum, setDatum]             = useState(isEdit ? toInputDate(prevoz.datum) : '');
  const [uraZacetek, setUraZacetek]   = useState(isEdit ? toInputTime(prevoz.zacetek) : '08:00');
  const [uraKonec, setUraKonec]       = useState(isEdit ? toInputTime(prevoz.konc) : '16:00');
  const [relacija, setRelacija]       = useState(isEdit ? (prevoz.relacija ?? '') : '');
  const [opis, setOpis]               = useState(isEdit ? (prevoz.opis ?? '') : '');
  const [cena, setCena]               = useState(isEdit ? (prevoz.cena ?? '') : '');
  const [placano, setPlacano]         = useState(isEdit ? prevoz.placano : false);
  const [selectedStranka, setSelectedStranka] = useState(isEdit ? String(prevoz.fk_stranka ?? '') : '');
  const [novaStrankaOpen, setNovaStrankaOpen] = useState(false);
  const [novaStrankaData, setNovaStrankaData] = useState({ naziv: '', email: '', telefonska: '', davcna_st: '' });
  const [novaStrankaSaving, setNovaStrankaSaving] = useState(false);
  const [selectedVozilo, setSelectedVozilo] = useState(isEdit ? String(prevoz.fk_vozilo ?? '') : '');
  const [selectedVoznik, setSelectedVoznik] = useState(isEdit ? String(prevoz.fk_uporabnik ?? '') : '');
  const [strankeList, setStrankeList] = useState([]);
  const [vozilaList, setVozilaList]   = useState([]);
  const [voznikiList, setVoznikiList] = useState([]);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState(null);

  const { zasedeniVozniki, zasedeniVozila } = useOverlapCheck(
    datum, uraZacetek, uraKonec, isEdit, prevoz?.id_voznja
  );

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, vRes, vnRes] = await Promise.all([
          api.get('/admin/stranke'),
          api.get('/admin/vozila'),
          api.get('/admin/vozniki'),
        ]);
        setStrankeList(sRes.data || []);
        setVozilaList(vRes.data || []);
        setVoznikiList(vnRes.data || []);
      } catch (e) {
        console.error('Load error', e);
      }
    };
    load();
  }, []);

  const handleSaveNovaStranka = async () => {
    setNovaStrankaSaving(true);
    try {
      const res = await api.post('/admin/stranke', {
        naziv:      novaStrankaData.naziv.trim(),
        email:      novaStrankaData.email      || undefined,
        telefonska: novaStrankaData.telefonska || undefined,
        davcna_st:  novaStrankaData.davcna_st  ? parseInt(novaStrankaData.davcna_st) : undefined,
      });
      setStrankeList((prev) => [...prev, res.data].sort((a, b) => a.naziv.localeCompare(b.naziv)));
      setSelectedStranka(String(res.data.id_stranka));
      setNovaStrankaOpen(false);
      setNovaStrankaData({ naziv: '', email: '', telefonska: '', davcna_st: '' });
    } catch {
      setError('Napaka pri ustvarjanju stranke.');
    } finally {
      setNovaStrankaSaving(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    const validationError = validatePrevoz(datum, selectedVoznik);
    if (validationError) return setError(validationError);

    try {
      setSaving(true);
      const body = buildPrevozPayload({ datum, uraZacetek, uraKonec, relacija, opis, cena, placano, selectedVozilo, selectedStranka, selectedVoznik });
      if (isEdit) {
        await api.put(`/admin/voznje/${prevoz.id_voznja}`, body);
      } else {
        await api.post('/admin/voznje/nova', body);
      }
      onSaved();
    } catch (e) {
      setError(e.response?.data?.error || 'Napaka pri shranjevanju.');
    } finally {
      setSaving(false);
    }
  };

  const voznikiItems = voznikiList.map((v) => ({
    id:    v.id_uporabnik,
    rawId: v.id_uporabnik,
    ime:   v.ime,
    priimek: v.priimek,
  }));

  const vozilaItems = vozilaList.map((v) => ({
    id:         v.id_vozilo,
    rawId:      v.id_vozilo,
    registerska: v.registerska,
    tip:        v.tip_vozila?.naziv,
  }));

  const submitLabel = isEdit ? 'Shrani spremembe' : 'Dodaj prevoz';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined rounded-lg bg-blue-50 p-2 text-blue-600">
              {isEdit ? 'edit_calendar' : 'add_road'}
            </span>
            <h2 className="text-base font-semibold text-slate-900">
              {isEdit ? 'Uredi prevoz' : 'Nov prevoz'}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Datum *</label>
              <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Začetek</label>
              <input type="time" value={uraZacetek} onChange={(e) => setUraZacetek(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Konec</label>
              <input type="time" value={uraKonec} onChange={(e) => setUraKonec(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Voznik *</label>
            <SelectionGrid
              items={voznikiItems}
              selectedId={selectedVoznik}
              zasedeni={zasedeniVozniki}
              onSelect={setSelectedVoznik}
              deselectable={false}
              renderItem={(item, selected, zaseden) => (
                <>
                  <span className="font-medium">{item.ime} {item.priimek}</span>
                  {zaseden && (
                    <span className={`ml-2 inline-flex items-center gap-0.5 text-[10px] font-bold ${selected ? 'text-orange-500' : 'text-yellow-600'}`}>
                      <span className="material-symbols-outlined text-[12px]">warning</span>
                      ZASEDEN
                    </span>
                  )}
                  {!zaseden && selected && <span className="material-symbols-outlined text-[16px] text-blue-600">check_circle</span>}
                </>
              )}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Vozilo</label>
            <SelectionGrid
              items={vozilaItems}
              selectedId={selectedVozilo}
              zasedeni={zasedeniVozila}
              onSelect={setSelectedVozilo}
              deselectable={true}
              renderItem={(item, selected, zaseden) => (
                <>
                  <div>
                    <p className="font-medium">{item.registerska}</p>
                    {item.tip && <p className="text-[11px] text-slate-500">{item.tip}</p>}
                  </div>
                  {zaseden && (
                    <span className={`ml-2 inline-flex items-center gap-0.5 text-[10px] font-bold ${selected ? 'text-orange-500' : 'text-yellow-600'}`}>
                      <span className="material-symbols-outlined text-[12px]">warning</span>
                      ZASEDEN
                    </span>
                  )}
                  {!zaseden && selected && <span className="material-symbols-outlined text-[16px] text-blue-600">check_circle</span>}
                </>
              )}
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-slate-600">Stranka</label>
              <button type="button" onClick={() => setNovaStrankaOpen((o) => !o)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50">
                <span className="material-symbols-outlined text-[14px]">{novaStrankaOpen ? 'close' : 'add'}</span>
                {novaStrankaOpen ? 'Prekliči' : 'Nova stranka'}
              </button>
            </div>
            <select value={selectedStranka} onChange={(e) => setSelectedStranka(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— Izberite stranko —</option>
              {strankeList.map((s) => (
                <option key={s.id_stranka} value={String(s.id_stranka)}>
                  {s.naziv}{s.telefonska ? ` · ${s.telefonska}` : ''}
                </option>
              ))}
            </select>
            {novaStrankaOpen && (
              <NovaStrankaForm
                data={novaStrankaData}
                onChange={setNovaStrankaData}
                onSave={handleSaveNovaStranka}
                saving={novaStrankaSaving}
              />
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Relacija</label>
            <input value={relacija} onChange={(e) => setRelacija(e.target.value)}
              placeholder="npr. Ljubljana → Maribor"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Opis</label>
            <textarea value={opis} onChange={(e) => setOpis(e.target.value)}
              placeholder="Dodatne opombe..."
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Cena (€)</label>
              <input type="number" min="0" step="0.01" value={cena} onChange={(e) => setCena(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="pb-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={placano} onChange={(e) => setPlacano(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-blue-600" />
                <span className="font-medium">Plačano</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Prekliči
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
            <span className="material-symbols-outlined text-[16px]">save</span>
            {saving ? 'Shranjujem...' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteModal({ prevoz, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState(null);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await api.delete(`/voznje/${prevoz.id_voznja}`);
      onDeleted();
    } catch (e) {
      setError(e.response?.data?.error ?? 'Brisanje ni uspelo.');
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
          <h2 className="text-base font-semibold text-slate-900">Izbriši prevoz</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ste prepričani, da želite izbrisati prevoz dne{' '}
            <span className="font-medium text-slate-700">{formatDate(prevoz.datum)}</span>?
          </p>
          {error && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Prekliči
          </button>
          <button type="button" onClick={handleDelete} disabled={deleting}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
            <span className="material-symbols-outlined text-[16px]">delete</span>
            {deleting ? 'Brišem...' : 'Izbriši'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Prevozi() {
  const [voznje, setVoznje]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [currentPage, setCurrentPage]     = useState(1);
  const [searchQuery, setSearchQuery]     = useState('');
  const [filterPlacano, setFilterPlacano] = useState('vse');
  const [modal, setModal]                 = useState(null);
  const [togglingId, setTogglingId]       = useState(null);
  const [confirmItem, setConfirmItem]     = useState(null);

  const fetchVoznje = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/admin/voznje?prihodnje=true');
      setVoznje(res.data || []);
    } catch (e) {
      setError(e.response?.data?.error || 'Napaka pri nalaganju prevozov');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVoznje(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterPlacano]);

  const togglePlacano = async (prevoz) => {
    try {
      setTogglingId(prevoz.id_voznja);
      await api.put(`/admin/voznje/${prevoz.id_voznja}`, { placano: !prevoz.placano });
      setVoznje((prev) => prev.map((v) =>
        v.id_voznja === prevoz.id_voznja ? { ...v, placano: !v.placano } : v
      ));
    } catch {
      setError('Napaka pri posodabljanju statusa plačila');
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = useMemo(() => {
    let data = [...voznje];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter((v) =>
        (v.relacija ?? '').toLowerCase().includes(q) ||
        (v.stranka?.naziv ?? v.stranka_ime ?? '').toLowerCase().includes(q) ||
        (v.vozilo?.registerska ?? '').toLowerCase().includes(q) ||
        (`${v.uporabnik?.ime ?? ''} ${v.uporabnik?.priimek ?? ''}`).toLowerCase().includes(q)
      );
    }
    if (filterPlacano === 'placano')   data = data.filter((v) => v.placano);
    if (filterPlacano === 'neplacano') data = data.filter((v) => !v.placano);
    data.sort((a, b) => new Date(a.datum) - new Date(b.datum));
    return data;
  }, [voznje, searchQuery, filterPlacano]);

  const totalPages   = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated    = useMemo(() => {
    const s = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(s, s + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);
  const startRow     = filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endRow       = Math.min(currentPage * ITEMS_PER_PAGE, filtered.length);
  const skupajCena   = useMemo(() => voznje.reduce((s, v) => s + (v.cena ?? 0), 0), [voznje]);
  const placanoCount   = useMemo(() => voznje.filter((v) => v.placano).length, [voznje]);
  const neplacanoCount = useMemo(() => voznje.filter((v) => !v.placano).length, [voznje]);

  const statKartice = [
    { label: 'Skupaj prevozov', icon: 'directions_bus', color: 'blue',    value: voznje.length },
    { label: 'Plačano',         icon: 'check_circle',   color: 'emerald', value: placanoCount },
    { label: 'Neplačano',       icon: 'cancel',         color: 'red',     value: neplacanoCount },
    { label: 'Skupaj vrednost', icon: 'euro',           color: 'amber',   value: formatCena(skupajCena) },
  ];

  return (
    <div className="flex">
      <Sidebar />

      {modal?.type === 'add' && (
        <PrevozModal mode="add" prevoz={null} onClose={() => setModal(null)} onSaved={() => { setModal(null); fetchVoznje(); }} />
      )}
      {modal?.type === 'edit' && (
        <PrevozModal mode="edit" prevoz={modal.prevoz} onClose={() => setModal(null)} onSaved={() => { setModal(null); fetchVoznje(); }} />
      )}
      {modal?.type === 'delete' && (
        <DeleteModal prevoz={modal.prevoz} onClose={() => setModal(null)} onDeleted={() => { setModal(null); fetchVoznje(); }} />
      )}

      <main className="ml-72 flex-1 p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Prevozi</h1>
            <p className="text-slate-500 mt-1">Prihodnji in načrtovani prevozi</p>
          </div>
          <div className="flex items-center gap-3 self-start md:self-auto">
            <button type="button" onClick={fetchVoznje} disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60">
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              {loading ? 'Osvežujem...' : 'Osveži'}
            </button>
            <button type="button" onClick={() => setModal({ type: 'add' })}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
              <span className="material-symbols-outlined text-[18px]">add_road</span>
              Nov prevoz
            </button>
          </div>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {statKartice.map(({ label, icon, color, value }) => (
            <article key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
              <div className="mt-3 flex items-center gap-3">
                <span className={`material-symbols-outlined rounded-lg bg-${color}-50 p-2 text-${color}-600`}>{icon}</span>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
            <input type="text" placeholder="Iskanje po stranki, relaciji, vozniku, vozilu…" value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500 whitespace-nowrap">Status:</label>
            <select value={filterPlacano} onChange={(e) => setFilterPlacano(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="vse">Vse</option>
              <option value="placano">Plačano</option>
              <option value="neplacano">Neplačano</option>
            </select>
          </div>
        </section>

        {loading && !voznje.length ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-500 shadow-sm">
            Nalaganje prevozov…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-500 shadow-sm">
            {voznje.length === 0 ? 'Ni prihodnjih prevozov' : 'Ni rezultatov za iskanje'}
          </div>
        ) : (
          <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse">
                <thead className="bg-slate-100">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <th className="px-5 py-4">Datum</th>
                    <th className="px-4 py-4">Stranka</th>
                    <th className="px-4 py-4">Vozilo</th>
                    <th className="px-4 py-4">Voznik</th>
                    <th className="px-4 py-4">Relacija</th>
                    <th className="px-4 py-4">Cena</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((v) => (
                    <tr key={v.id_voznja} className="border-t border-slate-200 hover:bg-slate-50/80">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined rounded-lg bg-blue-50 p-2 text-blue-600">calendar_today</span>
                          <div>
                            <p className="font-medium text-slate-900">{formatDate(v.datum)}</p>
                            <p className="text-xs text-slate-500">{formatCas(v.zacetek)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-800">{v.stranka?.naziv ?? v.stranka_ime ?? '-'}</p>
                        {v.stranka?.telefonska && <p className="text-xs text-slate-500">{v.stranka.telefonska}</p>}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-800">{v.vozilo?.registerska ?? '-'}</p>
                        {v.vozilo?.tip_vozila?.naziv && <p className="text-xs text-slate-500">{v.vozilo.tip_vozila.naziv}</p>}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {v.uporabnik ? `${v.uporabnik.ime} ${v.uporabnik.priimek}` : '-'}
                      </td>
                      <td className="px-4 py-4 text-slate-600 text-sm max-w-[160px] truncate">{v.relacija || '-'}</td>
                      <td className="px-4 py-4 font-semibold text-slate-800">{formatCena(v.cena)}</td>
                      <td className="px-4 py-4">
                        <button type="button" onClick={() => setConfirmItem(v)} disabled={togglingId === v.id_voznja}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold border transition-colors disabled:opacity-60 ${
                            v.placano
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                          }`}>
                          <span className="material-symbols-outlined text-[14px]">
                            {togglingId === v.id_voznja ? 'sync' : v.placano ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                          {v.placano ? 'Plačano' : 'Neplačano'}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button type="button" onClick={() => setModal({ type: 'edit', prevoz: v })}
                            className="inline-flex items-center rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button type="button" onClick={() => setModal({ type: 'delete', prevoz: v })}
                            className="inline-flex items-center rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Prikazano {startRow}–{endRow} od {filtered.length} prevozov
                {filtered.length !== voznje.length && <span className="ml-1 text-slate-400">(filtrirano iz {voznje.length})</span>}
              </p>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50">
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-blue-600 px-2 text-xs font-semibold text-white">
                  {currentPage}
                </span>
                <span className="text-xs text-slate-400">/ {totalPages}</span>
                <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50">
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      {confirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-base font-semibold text-slate-800">Potrditev spremembe</h2>
            <p className="mb-5 text-sm text-slate-600">
              Ali res želite spremeniti status plačila na{' '}
              <span className={`font-semibold ${confirmItem.placano ? 'text-red-600' : 'text-emerald-700'}`}>
                {confirmItem.placano ? 'Neplačano' : 'Plačano'}
              </span>?
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setConfirmItem(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Prekliči
              </button>
              <button type="button" onClick={() => { togglePlacano(confirmItem); setConfirmItem(null); }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Potrdi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}