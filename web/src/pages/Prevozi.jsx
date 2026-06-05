import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Sidebar from '../components/Sidebar';
import api from '../api/client';

const ITEMS_PER_PAGE = 10;

const formatDate = (v) => {
  if (!v) return '-';
  return new Date(v).toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

const combineDatumUra = (date, time) => {
  if (!date) return null;
  const [h, m] = (time || '08:00').split(':');
  return `${date}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`;
};

function validatePrevozForm({ datum, selectedVozilo, selectedVoznik, newStranka, strankaForm, selectedStranka }) {
  if (!datum) return 'Datum je obvezen.';
  if (!selectedVozilo) return 'Izberite vozilo.';
  if (!selectedVoznik) return 'Izberite voznika.';
  if (newStranka && !strankaForm.naziv.trim()) return 'Naziv stranke je obvezen.';
  if (!newStranka && !selectedStranka) return 'Izberite ali ustvarite stranko.';
  return null;
}

async function ustvariStranko(strankaForm) {
  const res = await api.post('/admin/stranke', {
    naziv:      strankaForm.naziv,
    email:      strankaForm.email || undefined,
    telefonska: strankaForm.telefonska || undefined,
    davcna_st:  strankaForm.davcna_st ? Number.parseInt(strankaForm.davcna_st) : undefined,
  });
  return String(res.data.id_stranka);
}

async function shraniPrevoz({ isEdit, prevoz, body }) {
  if (isEdit) {
    await api.put(`/admin/urnik/${prevoz.id_urnik}`, body);
  } else {
    await api.post('/admin/urnik', body);
  }
}

// ── SeznamGumb — posamezni gumb v listi vozil/voznikov ────────────────────────
function SeznamGumb({ idKey, labelFn, subLabelFn, ikona, v, zasedeni, selected, setSelected }) {
  const zasedeno   = zasedeni.includes(v[idKey]);
  const isSelected = selected === String(v[idKey]);

  const buttonClass = isSelected && zasedeno
    ? 'border-orange-400 bg-orange-50 text-orange-900'
    : zasedeno
    ? 'border-yellow-300 bg-yellow-50/60 hover:border-yellow-400 hover:bg-yellow-50 cursor-pointer'
    : isSelected
    ? 'border-blue-500 bg-blue-50 text-blue-800'
    : 'border-slate-300 bg-white hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer';

  const ikonaClass = isSelected ? (zasedeno ? 'text-orange-500' : 'text-blue-600') : 'text-slate-400';

  return (
    <button
      key={v[idKey]}
      type="button"
      onClick={() => setSelected(String(v[idKey]))}
      className={`w-full flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm text-left transition-colors ${buttonClass}`}
    >
      <div className="flex items-center gap-2">
        <span className={`material-symbols-outlined text-[18px] ${ikonaClass}`}>{ikona}</span>
        <div>
          <p className="font-medium">{labelFn(v)}</p>
          {subLabelFn && <p className="text-[11px] text-slate-500">{subLabelFn(v)}</p>}
        </div>
      </div>
      {zasedeno && (
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${isSelected ? 'text-orange-500' : 'text-yellow-600'}`}>
          <span className="material-symbols-outlined text-[13px]">warning</span>
          ZASEDENO
        </span>
      )}
      {!zasedeno && isSelected && <span className="material-symbols-outlined text-[18px] text-blue-600">check_circle</span>}
    </button>
  );
}

SeznamGumb.propTypes = {
  idKey:      PropTypes.string.isRequired,
  labelFn:    PropTypes.func.isRequired,
  subLabelFn: PropTypes.func,
  ikona:      PropTypes.string.isRequired,
  v:          PropTypes.object.isRequired,
  zasedeni:   PropTypes.array.isRequired,
  selected:   PropTypes.string.isRequired,
  setSelected: PropTypes.func.isRequired,
};

SeznamGumb.defaultProps = { subLabelFn: null };

// ── Konfiguracija za vozilo in voznik ─────────────────────────────────────────
function getVoziloConfig(props) {
  return {
    seznam:     props.vsiVozila,
    zasedeni:   props.zasedenaVozila,
    selected:   props.selectedVozilo,
    setSelected: props.setSelectedVozilo,
    idKey:      'id_vozilo',
    labelFn:    (v) => v.registerska,
    subLabelFn: (v) => `${v.tip_vozila?.naziv ?? '—'} · ${v.st_sedezev} sedežev`,
    ikona:      'directions_bus',
    naslov:     'Vozilo',
  };
}

function getVoznikConfig(props) {
  return {
    seznam:     props.vsiVozniki,
    zasedeni:   props.zasedeniVozniki,
    selected:   props.selectedVoznik,
    setSelected: props.setSelectedVoznik,
    idKey:      'id_uporabnik',
    labelFn:    (v) => `${v.ime} ${v.priimek}`,
    subLabelFn: null,
    ikona:      'person',
    naslov:     'Voznik',
  };
}

// ── VoziloVoznikSelector ──────────────────────────────────────────────────────
function VoziloVoznikSelector(props) {
  const { tip, datum, availabilityLoaded, availabilityLoading } = props;

  const config      = tip === 'vozilo' ? getVoziloConfig(props) : getVoznikConfig(props);
  const prostihCount = config.seznam.filter((v) => !config.zasedeni.includes(v[config.idKey])).length;

  const renderSeznam = () => (
    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
      {config.seznam.map((v) => (
        <SeznamGumb
          key={v[config.idKey]}
          idKey={config.idKey}
          labelFn={config.labelFn}
          subLabelFn={config.subLabelFn}
          ikona={config.ikona}
          v={v}
          zasedeni={config.zasedeni}
          selected={config.selected}
          setSelected={config.setSelected}
        />
      ))}
    </div>
  );

  const renderVsebina = () => {
    if (!datum) {
      return (
        <div className="rounded-lg border border-dashed border-slate-300 px-4 py-3 text-center text-xs text-slate-400">
          Najprej izberite datum
        </div>
      );
    }
    if (availabilityLoading) {
      return (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
          <span className="material-symbols-outlined animate-spin text-[18px] text-blue-500">sync</span>
          Nalagam razpoložljivost…
        </div>
      );
    }
    return renderSeznam();
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{config.naslov}</p>
        {datum && availabilityLoaded && (
          <span className="text-[11px] text-slate-400">{prostihCount} prostih za ta dan</span>
        )}
      </div>
      {renderVsebina()}
    </div>
  );
}

VoziloVoznikSelector.propTypes = {
  tip:                  PropTypes.string.isRequired,
  datum:                PropTypes.string.isRequired,
  availabilityLoaded:   PropTypes.bool.isRequired,
  availabilityLoading:  PropTypes.bool.isRequired,
  vsiVozila:            PropTypes.array.isRequired,
  vsiVozniki:           PropTypes.array.isRequired,
  zasedenaVozila:       PropTypes.array.isRequired,
  zasedeniVozniki:      PropTypes.array.isRequired,
  selectedVozilo:       PropTypes.string.isRequired,
  selectedVoznik:       PropTypes.string.isRequired,
  setSelectedVozilo:    PropTypes.func.isRequired,
  setSelectedVoznik:    PropTypes.func.isRequired,
};

// ─── Custom hooks for state initialization and availability check ────────────
function useModalInitialState(mode, prevoz) {
  const isEdit = mode === 'edit';
  
  return useMemo(() => ({
    isEdit,
    datum: isEdit ? toInputDate(prevoz.datum) : '',
    ura: isEdit ? toInputTime(prevoz.datum) : '08:00',
    naziv: isEdit ? (prevoz.naziv ?? '') : '',
    cena: isEdit ? (prevoz.cena ?? '') : '',
    placano: isEdit ? prevoz.placano : false,
    selectedStranka: isEdit ? String(prevoz.fk_stranka) : '',
    selectedVozilo: isEdit ? String(prevoz.fk_vozilo) : '',
    selectedVoznik: isEdit ? String(prevoz.fk_uporabnik) : '',
  }), [mode, prevoz]);
}

function useAvailabilityCheck(datum, isEdit, prevoz) {
  const [zasedenaVozila, setZasedenaVozila] = useState([]);
  const [zasedeniVozniki, setZasedeniVozniki] = useState([]);
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  useEffect(() => {
    if (!datum) {
      setZasedenaVozila([]);
      setZasedeniVozniki([]);
      setAvailabilityLoaded(false);
      setAvailabilityLoading(false);
      return;
    }

    const checkAvailability = async () => {
      try {
        setAvailabilityLoading(true);
        const excludeParam = isEdit ? `&exclude_id=${prevoz.id_urnik}` : '';
        const res = await api.get(`/admin/urnik/zasedeno?datum=${datum}${excludeParam}`);
        setZasedenaVozila(res.data?.vozila ?? []);
        setZasedeniVozniki(res.data?.vozniki ?? []);
        setAvailabilityLoaded(true);
      } catch (e) {
        console.error('Availability check failed:', e);
        setAvailabilityLoaded(true);
      } finally {
        setAvailabilityLoading(false);
      }
    };

    checkAvailability();
  }, [datum, isEdit, prevoz]);

  return { zasedenaVozila, zasedeniVozniki, availabilityLoaded, availabilityLoading };
}

// ─── New/Edit Modal ───────────────────────────────────────────────────────────
function PrevozModal({ mode, prevoz, onClose, onSaved }) {
  const initialState = useModalInitialState(mode, prevoz);
  const { isEdit, datum: initialDatum, ura: initialUra, naziv: initialNaziv, 
          cena: initialCena, placano: initialPlacano, selectedStranka: initialStranka,
          selectedVozilo: initialVozilo, selectedVoznik: initialVoznik } = initialState;

  const [datum, setDatum] = useState(initialDatum);
  const [ura, setUra] = useState(initialUra);
  const [naziv, setNaziv] = useState(initialNaziv);
  const [cena, setCena] = useState(initialCena);
  const [placano, setPlacano] = useState(initialPlacano);
  const [strankeList, setStrankeList] = useState([]);
  const [selectedStranka, setSelectedStranka] = useState(initialStranka);
  const [newStranka, setNewStranka] = useState(false);
  const [strankaForm, setStrankaForm] = useState({ naziv: '', email: '', telefonska: '', davcna_st: '' });
  const [vsiVozila, setVsiVozila] = useState([]);
  const [vsiVozniki, setVsiVozniki] = useState([]);
  const [selectedVozilo, setSelectedVozilo] = useState(initialVozilo);
  const [selectedVoznik, setSelectedVoznik] = useState(initialVoznik);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const { zasedenaVozila, zasedeniVozniki, availabilityLoaded, availabilityLoading } = 
    useAvailabilityCheck(datum, isEdit, prevoz);

  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [sRes, vozilaRes, voznikiRes] = await Promise.all([
          api.get('/admin/stranke'),
          api.get('/admin/vozila'),
          api.get('/admin/vozniki'),
        ]);
        setStrankeList(sRes.data || []);
        setVsiVozila(vozilaRes.data || []);
        setVsiVozniki(voznikiRes.data || []);
      } catch (e) {
        console.error('Load error', e);
      }
    };
    loadMasterData();
  }, []);

  const setS = (field) => (e) => setStrankaForm((p) => ({ ...p, [field]: e.target.value }));

  const handleDatumChange = (e) => {
    setDatum(e.target.value);
    setSelectedVozilo('');
    setSelectedVoznik('');
  };

  const handleSubmit = async () => {
    setError(null);
    const validErr = validatePrevozForm({ datum, selectedVozilo, selectedVoznik, newStranka, strankaForm, selectedStranka });
    if (validErr) return setError(validErr);

    let strankaId = selectedStranka;
    if (newStranka) {
      try {
        strankaId = await ustvariStranko(strankaForm);
      } catch (e) {
        return setError(e.response?.data?.error || 'Napaka pri ustvarjanju stranke.');
      }
    }

    try {
      setSaving(true);
      const body = {
        datum: combineDatumUra(datum, ura),
        naziv: naziv || undefined,
        cena: cena !== '' ? Number.parseFloat(cena) : undefined,
        placano,
        fk_vozilo: Number.parseInt(selectedVozilo),
        fk_uporabnik: Number.parseInt(selectedVoznik),
        fk_stranka: Number.parseInt(strankaId),
      };
      await shraniPrevoz({ isEdit, prevoz, body });
      onSaved();
    } catch (e) {
      setError(e.response?.data?.error || 'Napaka pri shranjevanju.');
    } finally {
      setSaving(false);
    }
  };

  const selectorProps = {
    datum, availabilityLoaded, availabilityLoading,
    vsiVozila, vsiVozniki, zasedenaVozila, zasedeniVozniki,
    selectedVozilo, selectedVoznik, setSelectedVozilo, setSelectedVoznik,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl my-8">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined rounded-lg bg-blue-50 p-2 text-blue-600">
              {isEdit ? 'edit_calendar' : 'add_road'}
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {isEdit ? 'Uredi prevoz' : 'Nov prevoz'}
              </h2>
              {isEdit && <p className="text-xs text-slate-500">ID: {prevoz.id_urnik}</p>}
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Datum in čas odhoda</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="datum-input" className="mb-1 block text-xs font-medium text-slate-600">Datum *</label>
                <input id="datum-input" type="date" value={datum} onChange={handleDatumChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label htmlFor="ura-input" className="mb-1 block text-xs font-medium text-slate-600">Ura odhoda *</label>
                <input id="ura-input" type="time" value={ura} onChange={(e) => setUra(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Stranka</p>
              <button type="button" onClick={() => { setNewStranka((p) => !p); setSelectedStranka(''); }}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold border transition-colors ${
                  newStranka ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'
                }`}>
                <span className="material-symbols-outlined text-[13px]">{newStranka ? 'list' : 'person_add'}</span>
                {newStranka ? 'Obstoječa stranka' : 'Nova stranka'}
              </button>
            </div>
            {newStranka ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div>
                  <label htmlFor="stranka-naziv" className="mb-1 block text-xs font-medium text-slate-600">Naziv *</label>
                  <input id="stranka-naziv" value={strankaForm.naziv} onChange={setS('naziv')}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="stranka-email" className="mb-1 block text-xs font-medium text-slate-600">E-pošta</label>
                    <input id="stranka-email" type="email" value={strankaForm.email} onChange={setS('email')}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label htmlFor="stranka-tel" className="mb-1 block text-xs font-medium text-slate-600">Telefon</label>
                    <input id="stranka-tel" value={strankaForm.telefonska} onChange={setS('telefonska')}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label htmlFor="stranka-davcna" className="mb-1 block text-xs font-medium text-slate-600">Davčna št.</label>
                    <input id="stranka-davcna" type="number" value={strankaForm.davcna_st} onChange={setS('davcna_st')}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
            ) : (
              <select value={selectedStranka} onChange={(e) => setSelectedStranka(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Izberite stranko —</option>
                {strankeList.map((s) => (
                  <option key={s.id_stranka} value={String(s.id_stranka)}>
                    {s.naziv}{s.telefonska ? ` · ${s.telefonska}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <VoziloVoznikSelector tip="vozilo" {...selectorProps} />
          <VoziloVoznikSelector tip="voznik" {...selectorProps} />

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Dodatne informacije</p>
            <div className="space-y-3">
              <div>
                <label htmlFor="naziv-input" className="mb-1 block text-xs font-medium text-slate-600">Naziv / Relacija</label>
                <input id="naziv-input" value={naziv} onChange={(e) => setNaziv(e.target.value)}
                  placeholder="npr. Ljubljana → Maribor" maxLength={45}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label htmlFor="cena-input" className="mb-1 block text-xs font-medium text-slate-600">Cena (€)</label>
                  <input id="cena-input" type="number" min="0" step="0.01" value={cena}
                    onChange={(e) => setCena(e.target.value)} placeholder="0.00"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 sticky bottom-0 bg-white rounded-b-2xl">
          <button type="button" onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Prekliči
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
            <span className="material-symbols-outlined text-[16px]">save</span>
            {saving ? 'Shranjujem...' : isEdit ? 'Shrani spremembe' : 'Dodaj prevoz'}
          </button>
        </div>
      </div>
    </div>
  );
}

PrevozModal.propTypes = {
  mode:    PropTypes.string.isRequired,
  prevoz:  PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};

PrevozModal.defaultProps = { prevoz: null };

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({ prevoz, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState(null);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await api.delete(`/admin/urnik/${prevoz.id_urnik}`);
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
            Ste prepričani, da želite izbrisati prevoz
            {prevoz.naziv ? ` "${prevoz.naziv}"` : ''} dne{' '}
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

DeleteModal.propTypes = {
  prevoz:    PropTypes.object.isRequired,
  onClose:   PropTypes.func.isRequired,
  onDeleted: PropTypes.func.isRequired,
};

// ─── SortIcon ─────────────────────────────────────────────────────────────────
function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) {
    return <span className="material-symbols-outlined text-[14px] text-slate-300">unfold_more</span>;
  }
  return (
    <span className="material-symbols-outlined text-[14px] text-blue-600">
      {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
    </span>
  );
}

SortIcon.propTypes = {
  field:     PropTypes.string.isRequired,
  sortField: PropTypes.string.isRequired,
  sortDir:   PropTypes.string.isRequired,
};

function getSortValues(a, b, sortField) {
  if (sortField === 'datum')   return [new Date(a.datum), new Date(b.datum)];
  if (sortField === 'stranka') return [a.stranka?.naziv ?? '', b.stranka?.naziv ?? ''];
  if (sortField === 'cena')    return [a.cena ?? -1, b.cena ?? -1];
  if (sortField === 'voznik')  return [a.uporabnik?.priimek ?? '', b.uporabnik?.priimek ?? ''];
  return [a[sortField] ?? '', b[sortField] ?? ''];
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Prevozi() {
  const [urnik, setUrnik]                 = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [currentPage, setCurrentPage]     = useState(1);
  const [searchQuery, setSearchQuery]     = useState('');
  const [filterPlacano, setFilterPlacano] = useState('vse');
  const [sortField, setSortField]         = useState('datum');
  const [sortDir, setSortDir]             = useState('desc');
  const [modal, setModal]                 = useState(null);
  const [togglingId, setTogglingId]       = useState(null);
  const [confirmItem, setConfirmItem]     = useState(null);

  const fetchUrnik = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/admin/urnik');
      setUrnik(res.data || []);
    } catch (e) {
      setError(e.response?.data?.error || 'Napaka pri nalaganju prevozov');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUrnik(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterPlacano, sortField, sortDir]);

  const togglePlacano = async (prevoz) => {
    try {
      setTogglingId(prevoz.id_urnik);
      await api.put(`/admin/urnik/${prevoz.id_urnik}`, { placano: !prevoz.placano });
      setUrnik((prev) => prev.map((u) => u.id_urnik === prevoz.id_urnik ? { ...u, placano: !u.placano } : u));
    } catch {
      setError('Napaka pri posodabljanju statusa plačila');
    } finally {
      setTogglingId(null);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    let data = [...urnik];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter((u) =>
        (u.naziv ?? '').toLowerCase().includes(q) ||
        (u.stranka?.naziv ?? '').toLowerCase().includes(q) ||
        (u.vozilo?.registerska ?? '').toLowerCase().includes(q) ||
        (`${u.uporabnik?.ime ?? ''} ${u.uporabnik?.priimek ?? ''}`).toLowerCase().includes(q)
      );
    }
    if (filterPlacano === 'placano')   data = data.filter((u) => u.placano);
    if (filterPlacano === 'neplacano') data = data.filter((u) => !u.placano);
    data.sort((a, b) => {
      const [av, bv] = getSortValues(a, b, sortField);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [urnik, searchQuery, filterPlacano, sortField, sortDir]);

  const totalPages     = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated      = useMemo(() => { const s = (currentPage - 1) * ITEMS_PER_PAGE; return filtered.slice(s, s + ITEMS_PER_PAGE); }, [filtered, currentPage]);
  const startRow       = filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endRow         = Math.min(currentPage * ITEMS_PER_PAGE, filtered.length);
  const skupajCena     = useMemo(() => urnik.reduce((s, u) => s + (u.cena ?? 0), 0), [urnik]);
  const placanoCount   = useMemo(() => urnik.filter((u) => u.placano).length, [urnik]);
  const neplacanoCount = useMemo(() => urnik.filter((u) => !u.placano).length, [urnik]);

  const statKartice = [
    { label: 'Skupaj prevozov', icon: 'directions_bus', color: 'blue',    value: urnik.length },
    { label: 'Plačano',         icon: 'check_circle',   color: 'emerald', value: placanoCount },
    { label: 'Neplačano',       icon: 'cancel',         color: 'red',     value: neplacanoCount },
    { label: 'Skupaj vrednost', icon: 'euro',           color: 'amber',   value: formatCena(skupajCena) },
  ];

  return (
    <div className="flex">
      <Sidebar />

      {modal?.type === 'add' && (
        <PrevozModal mode="add" prevoz={null} onClose={() => setModal(null)} onSaved={() => { setModal(null); fetchUrnik(); }} />
      )}
      {modal?.type === 'edit' && (
        <PrevozModal mode="edit" prevoz={modal.prevoz} onClose={() => setModal(null)} onSaved={() => { setModal(null); fetchUrnik(); }} />
      )}
      {modal?.type === 'delete' && (
        <DeleteModal prevoz={modal.prevoz} onClose={() => setModal(null)} onDeleted={() => { setModal(null); fetchUrnik(); }} />
      )}

      <main className="ml-72 flex-1 p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Prevozi</h1>
            <p className="text-slate-500 mt-1">Upravljanje z urniki in prevozi</p>
          </div>
          <div className="flex items-center gap-3 self-start md:self-auto">
            <button type="button" onClick={fetchUrnik} disabled={loading}
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
            <label htmlFor="filter-placano" className="text-xs font-medium text-slate-500 whitespace-nowrap">Status:</label>
            <select id="filter-placano" value={filterPlacano} onChange={(e) => setFilterPlacano(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="vse">Vse</option>
              <option value="placano">Plačano</option>
              <option value="neplacano">Neplačano</option>
            </select>
          </div>
        </section>

        {loading && !urnik.length ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-500 shadow-sm">
            Nalaganje prevozov…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-500 shadow-sm">
            {urnik.length === 0 ? 'Ni dodanih prevozov' : 'Ni rezultatov za iskanje'}
          </div>
        ) : (
          <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border-collapse">
                <thead className="bg-slate-100">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <th className="px-5 py-4 cursor-pointer hover:text-slate-900" onClick={() => handleSort('datum')}>
                      <div className="flex items-center gap-1">Datum <SortIcon field="datum" sortField={sortField} sortDir={sortDir} /></div>
                    </th>
                    <th className="px-4 py-4 cursor-pointer hover:text-slate-900" onClick={() => handleSort('stranka')}>
                      <div className="flex items-center gap-1">Stranka <SortIcon field="stranka" sortField={sortField} sortDir={sortDir} /></div>
                    </th>
                    <th className="px-4 py-4">Vozilo</th>
                    <th className="px-4 py-4 cursor-pointer hover:text-slate-900" onClick={() => handleSort('voznik')}>
                      <div className="flex items-center gap-1">Voznik <SortIcon field="voznik" sortField={sortField} sortDir={sortDir} /></div>
                    </th>
                    <th className="px-4 py-4">Relacija</th>
                    <th className="px-4 py-4 cursor-pointer hover:text-slate-900" onClick={() => handleSort('cena')}>
                      <div className="flex items-center gap-1">Cena <SortIcon field="cena" sortField={sortField} sortDir={sortDir} /></div>
                    </th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((u) => (
                    <tr key={u.id_urnik} className="border-t border-slate-200 hover:bg-slate-50/80">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined rounded-lg bg-blue-50 p-2 text-blue-600">calendar_today</span>
                          <div>
                            <p className="font-medium text-slate-900">{formatDate(u.datum)}</p>
                            <p className="text-xs text-slate-500">{toInputTime(u.datum)}</p>
                          </div>
                        </div>
                       </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-800">{u.stranka?.naziv ?? '-'}</p>
                        {u.stranka?.telefonska && <p className="text-xs text-slate-500">{u.stranka.telefonska}</p>}
                       </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-800">{u.vozilo?.registerska ?? '-'}</p>
                        {u.vozilo?.tip_vozila?.naziv && <p className="text-xs text-slate-500">{u.vozilo.tip_vozila.naziv}</p>}
                       </td>
                      <td className="px-4 py-4 text-slate-700">
                        {u.uporabnik ? `${u.uporabnik.ime} ${u.uporabnik.priimek}` : '-'}
                       </td>
                      <td className="px-4 py-4 text-slate-600 text-sm max-w-[160px] truncate">{u.naziv || '-'}</td>
                      <td className="px-4 py-4 font-semibold text-slate-800">{formatCena(u.cena)}</td>
                      <td className="px-4 py-4">
                        <button type="button" onClick={() => setConfirmItem(u)} disabled={togglingId === u.id_urnik}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold border transition-colors disabled:opacity-60 ${
                            u.placano
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                          }`}>
                          <span className="material-symbols-outlined text-[14px]">
                            {togglingId === u.id_urnik ? 'sync' : u.placano ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                          {u.placano ? 'Plačano' : 'Neplačano'}
                        </button>
                       </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button type="button" onClick={() => setModal({ type: 'edit', prevoz: u })}
                            className="inline-flex items-center rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button type="button" onClick={() => setModal({ type: 'delete', prevoz: u })}
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
                {filtered.length !== urnik.length && <span className="ml-1 text-slate-400">(filtrirano iz {urnik.length})</span>}
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
              </span>
              ?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmItem(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Prekliči
              </button>
              <button
                type="button"
                onClick={() => { togglePlacano(confirmItem); setConfirmItem(null); }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Potrdi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}