import { useState, useEffect, useMemo } from 'react';
import api from "../../api/client";
import { VBarChart, VozilaLineGraf } from './components/charts';
import { DriverHBar, HBar } from './components/StatCard';
import { fmtH, fmtEur, TEDEN, LINE_COLORS } from './utils/dashboardUtils';

const STANJE_COLORS = {
  VOZNJA:          '#1d4ed8',
  DELO:            '#6b21a8',
  POCITEK:         '#166534',
  ODMOR:           '#92400e',
  RAZPOLOZLJIVOST: '#c2410c',
  DRUGO:           '#6b7280',
  NEZNANO:         '#9ca3af',
};

function buildDnevnaStanja(tahData, voznikId, period) {
  const [year, month] = period.split('-').map(Number);
  const daysInMonth   = new Date(year, month, 0).getDate();
  const dnevno        = {};

  for (let i = 1; i <= daysInMonth; i++) {
    dnevno[i] = { VOZNJA: 0, DELO: 0 };
  }

  tahData
    .filter((z) => z.fk_uporabnik === voznikId && (z.stanje === 'VOZNJA' || z.stanje === 'DELO'))
    .forEach((z) => {
      const d = new Date(z.zacetek).getDate();
      if (dnevno[d]) dnevno[d][z.stanje] += (z.trajanje_min ?? 0) / 60;
    });

  return Object.entries(dnevno).map(([dan, s]) => ({
    dan:    parseInt(dan),
    voznja: Math.round(s.VOZNJA * 100) / 100,
    delo:   Math.round(s.DELO   * 100) / 100,
  }));
}

function DnevnaStanjaGraf({ stanjeByVoznik }) {
  if (!stanjeByVoznik.length) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        Ni tahografskih zapisov za ta mesec.
      </div>
    );
  }

  const STACKED = [
    { key: 'delo',   color: '#f97316' },
    { key: 'voznja', color: '#1d4ed8' },
  ];

  const maxH  = Math.max(1, ...stanjeByVoznik.map((d) => d.voznja + d.delo));
  const bW    = Math.min(28, 1100 / stanjeByVoznik.length - 4);
  const sp    = 1100 / stanjeByVoznik.length;
  const PAD_L = 60;
  const PAD_T = 20;
  const gH    = 240;
  const yP    = (v) => PAD_T + gH - (v / maxH) * gH;

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <>
      <div className="h-72">
        <svg viewBox="0 0 1200 300" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          <rect width="1200" height="300" fill="white" />
          {gridLines.map((f) => {
            const y = yP(maxH * f);
            return (
              <g key={f}>
                <line x1={PAD_L} y1={y} x2={1190} y2={y} stroke="#f3f4f6" strokeWidth="1" />
                <text x={PAD_L - 4} y={y + 4} fontSize="10" fill="#9ca3af" textAnchor="end">
                  {Math.round(maxH * f * 10) / 10}h
                </text>
              </g>
            );
          })}
          {stanjeByVoznik.map((d, i) => {
            const x    = PAD_L + i * sp + (sp - bW) / 2;
            let yTop   = PAD_T + gH;
            const show = i === 0 || i % 3 === 0 || i === stanjeByVoznik.length - 1;
            return (
              <g key={d.dan}>
                {STACKED.map(({ key, color }) => {
                  const h = (d[key] / maxH) * gH;
                  if (h <= 0) return null;
                  yTop -= h;
                  return <rect key={key} x={x} y={yTop} width={bW} height={h} fill={color} />;
                })}
                {show && (
                  <text x={x + bW / 2} y={PAD_T + gH + 14} fontSize="10" fill="#9ca3af" textAnchor="middle">
                    {d.dan}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex flex-wrap gap-4 mt-3">
        {[{ color: '#1d4ed8', label: 'Vožnja' }, { color: '#f97316', label: 'Delo' }].map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.label}
          </div>
        ))}
      </div>
    </>
  );
}

function ComplianceTable({ compliance }) {
  if (!compliance.length) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="text-sm font-bold text-gray-800 mb-1">Skladnost vožnje voznikov</h3>
      <p className="text-xs text-gray-400 mb-4">Max dnevna vožnja in prekoračitve meje 9h (Uredba EU 561/2006)</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 text-gray-500 uppercase tracking-wide">
              <th className="py-2 text-left font-semibold">Voznik</th>
              <th className="py-2 text-center font-semibold">Dni z vožnjo</th>
              <th className="py-2 text-center font-semibold">Max dnevna vožnja</th>
              <th className="py-2 text-center font-semibold">Prekoračitve 9h</th>
              <th className="py-2 text-left font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {compliance.map((c) => (
              <tr key={c.name} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2.5 font-medium text-gray-800">{c.name}</td>
                <td className="py-2.5 text-center text-gray-600">{c.dni}</td>
                <td className="py-2.5 text-center">
                  <span className={`font-semibold ${c.maxDnevno > 9 ? 'text-red-600' : 'text-gray-700'}`}>
                    {fmtH(c.maxDnevno)}
                  </span>
                </td>
                <td className="py-2.5 text-center">
                  <span className={`font-bold ${c.presezkov > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {c.presezkov}
                  </span>
                </td>
                <td className="py-2.5">
                  {c.presezkov > 0
                    ? <span className="inline-flex items-center gap-1 text-red-600 font-semibold"><span className="material-symbols-outlined text-[13px]">warning</span>Prekoračitev</span>
                    : <span className="inline-flex items-center gap-1 text-emerald-600"><span className="material-symbols-outlined text-[13px]">check_circle</span>Skladna</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AnalyticsTab() {
  const [period, setPeriod]                     = useState(() => new Date().toISOString().slice(0, 7));
  const [tahData, setTahData]                   = useState([]);
  const [voznjeAll, setVoznjeAll]               = useState([]);
  const [voznikiList, setVoznikiList]           = useState([]);
  const [loading, setLoading]                   = useState(false);
  const [selectedVoznikStanje, setSelectedVoznikStanje] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [yr, mo] = period.split('-').map(Number);
        const od       = `${period}-01`;
        const lastDay  = new Date(yr, mo, 0).getDate();
        const doDate   = `${period}-${String(lastDay).padStart(2, '0')}`;

        const [tahRes, voznjeRes, voznikiRes] = await Promise.all([
          api.get(`/admin/tahograf?od=${od}&do=${doDate}`),
          api.get('/admin/voznje'),
          api.get('/admin/vozniki'),
        ]);

        setTahData(tahRes.data       || []);
        setVoznjeAll(voznjeRes.data  || []);
        setVoznikiList(voznikiRes.data || []);
      } catch {
        setTahData([]); setVoznjeAll([]); setVoznikiList([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period]);

  const [yr, mo] = period.split('-').map(Number);
  const lastDay  = new Date(yr, mo, 0).getDate();

  const urnikMesec = useMemo(() =>
    voznjeAll.filter((u) => {
      const d = new Date(u.datum);
      return d.getFullYear() === yr && d.getMonth() + 1 === mo;
    }),
    [voznjeAll, yr, mo]);

  const kpi = useMemo(() => {
    const voznjaMin  = tahData.filter((z) => z.stanje === 'VOZNJA').reduce((s, z) => s + (z.trajanje_min ?? 0), 0);
    const deloMin    = tahData.filter((z) => z.stanje === 'DELO').reduce((s, z) => s + (z.trajanje_min ?? 0), 0);
    const pocitekMin = tahData.filter((z) => z.stanje === 'POCITEK').reduce((s, z) => s + (z.trajanje_min ?? 0), 0);
    return {
      voznjaH:       voznjaMin / 60,
      deloH:         deloMin / 60,
      pocitekH:      pocitekMin / 60,
      aktivniVozniki: new Set(tahData.map((z) => z.fk_uporabnik)).size,
      aktivnaVozila:  new Set(tahData.map((z) => z.registrska).filter(Boolean)).size,
      skupnaVrednost: urnikMesec.filter((u) => u.cena != null).reduce((s, u) => s + u.cena, 0),
      neplacano:      urnikMesec.filter((u) => !u.placano && u.cena != null).reduce((s, u) => s + u.cena, 0),
      stPrevozov:     urnikMesec.length,
    };
  }, [tahData, urnikMesec]);

  const driverHours = useMemo(() => {
    const map = {};
    voznikiList.forEach((v) => {
      map[v.id_uporabnik] = { name: `${v.priimek} ${v.ime[0]}.`, v: 0, d: 0 };
    });
    tahData.filter((z) => z.stanje === 'VOZNJA' || z.stanje === 'DELO').forEach((z) => {
      const k    = z.fk_uporabnik;
      const name = z.uporabnik ? `${z.uporabnik.priimek} ${z.uporabnik.ime[0]}.` : `ID ${k}`;
      if (!map[k]) map[k] = { name, v: 0, d: 0 };
      if (z.stanje === 'VOZNJA') map[k].v += z.trajanje_min ?? 0;
      else map[k].d += z.trajanje_min ?? 0;
    });
    return Object.values(map)
      .map((x) => ({
        name:   x.name,
        voznja: Math.round(x.v / 60 * 10) / 10,
        delo:   Math.round(x.d / 60 * 10) / 10,
        total:  Math.round((x.v + x.d) / 60 * 10) / 10,
      }))
      .sort((a, b) => b.total - a.total);
  }, [tahData, voznikiList]);

  const vehicleHours = useMemo(() => {
    const map = {};
    tahData.filter((z) => z.registrska && (z.stanje === 'VOZNJA' || z.stanje === 'DELO')).forEach((z) => {
      if (!map[z.registrska]) map[z.registrska] = { v: 0, d: 0 };
      if (z.stanje === 'VOZNJA') map[z.registrska].v += z.trajanje_min ?? 0;
      else map[z.registrska].d += z.trajanje_min ?? 0;
    });
    return Object.entries(map)
      .map(([reg, x]) => ({
        registerska: reg,
        total:       Math.round((x.v + x.d) / 60 * 10) / 10,
      }))
      .sort((a, b) => b.total - a.total);
  }, [tahData]);

  const driverDailyTrend = useMemo(() => {
    const map = {};
    tahData.filter((z) => z.stanje === 'VOZNJA' || z.stanje === 'DELO').forEach((z) => {
      const k    = z.fk_uporabnik;
      const name = z.uporabnik ? `${z.uporabnik.priimek} ${z.uporabnik.ime[0]}.` : `ID ${k}`;
      if (!map[k]) map[k] = { label: name, dnevno: Array(lastDay).fill(0) };
      const day = new Date(z.zacetek).getDate();
      if (day >= 1 && day <= lastDay) map[k].dnevno[day - 1] += (z.trajanje_min ?? 0) / 60;
    });
    return Object.values(map)
      .map((x) => ({ ...x, dnevno: x.dnevno.map((h) => Math.round(h * 10) / 10) }))
      .filter((x) => x.dnevno.some((h) => h > 0))
      .sort((a, b) => b.dnevno.reduce((s, h) => s + h, 0) - a.dnevno.reduce((s, h) => s + h, 0));
  }, [tahData, lastDay]);

  const weeklyPattern = useMemo(() => {
    const sums = Array(7).fill(0);
    const cnt  = Array(7).fill(0);
    tahData.filter((z) => z.stanje === 'VOZNJA' || z.stanje === 'DELO').forEach((z) => {
      const dow = (new Date(z.zacetek).getDay() + 6) % 7;
      sums[dow] += (z.trajanje_min ?? 0) / 60;
      cnt[dow]++;
    });
    return TEDEN.map((label, i) => ({
      label,
      value: cnt[i] > 0 ? Math.round(sums[i] / cnt[i] * 10) / 10 : 0,
    }));
  }, [tahData]);

  const topStranke = useMemo(() => {
    const map = {};
    urnikMesec.filter((u) => u.cena != null && u.stranka).forEach((u) => {
      const n = u.stranka.naziv || '—';
      if (!map[n]) map[n] = { skupaj: 0, placano: 0 };
      map[n].skupaj += u.cena;
      if (u.placano) map[n].placano += u.cena;
    });
    return Object.entries(map)
      .map(([naziv, x]) => ({
        label:  naziv,
        value:  Math.round(x.skupaj * 100) / 100,
        value2: Math.round(x.placano * 100) / 100,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [urnikMesec]);

  const compliance = useMemo(() => {
    const map = {};
    tahData.filter((z) => z.stanje === 'VOZNJA').forEach((z) => {
      const k    = z.fk_uporabnik;
      const name = z.uporabnik ? `${z.uporabnik.priimek} ${z.uporabnik.ime[0]}.` : `ID ${k}`;
      const day  = new Date(z.zacetek).toISOString().slice(0, 10);
      if (!map[k]) map[k] = { name, days: {} };
      map[k].days[day] = (map[k].days[day] || 0) + (z.trajanje_min ?? 0) / 60;
    });
    return Object.values(map).map((x) => {
      const vals = Object.values(x.days);
      return {
        name:       x.name,
        maxDnevno:  Math.round(Math.max(0, ...vals) * 10) / 10,
        presezkov:  vals.filter((h) => h > 9).length,
        dni:        vals.length,
      };
    }).sort((a, b) => b.presezkov - a.presezkov || b.maxDnevno - a.maxDnevno);
  }, [tahData]);

  const voznjePoMesecih = useMemo(() => {
    const map = {};
    voznjeAll.forEach((v) => {
      const key = new Date(v.zacetek).toISOString().slice(0, 7);
      map[key]  = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([mesec, stevilo]) => ({
        label: new Date(mesec + '-01').toLocaleDateString('sl-SI', { month: 'short', year: '2-digit' }),
        value: stevilo,
      }));
  }, [voznjeAll]);

  const stanjeByVoznik = useMemo(() => {
    if (!selectedVoznikStanje) return [];
    return buildDnevnaStanja(tahData, parseInt(selectedVoznikStanje), period);
  }, [tahData, selectedVoznikStanje, period]);

  const stanjeVoznikiOptions = useMemo(() =>
    Array.from(new Map(tahData.map((z) => [z.fk_uporabnik, z.uporabnik])).entries())
      .map(([id, u]) => ({ id, name: u ? `${u.ime} ${u.priimek}` : `ID ${id}` }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [tahData]);

  const monthlyRevenueTrend = useMemo(() => {
    const map = {};
    voznjeAll.filter((u) => u.cena != null).forEach((u) => {
      const key = new Date(u.datum).toISOString().slice(0, 7);
      if (!map[key]) map[key] = { skupaj: 0, placano: 0 };
      map[key].skupaj += u.cena;
      if (u.placano) map[key].placano += u.cena;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([m, x]) => ({
        _month: m,
        label:  m.slice(5) + '/' + m.slice(2, 4),
        value:  Math.round(x.skupaj * 100) / 100,
        value2: Math.round(x.placano * 100) / 100,
      }));
  }, [voznjeAll]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 gap-3">
        <span className="material-symbols-outlined animate-spin text-2xl">sync</span>
        <span>Nalaganje analitike…</span>
      </div>
    );
  }

  const noData = tahData.length === 0 && urnikMesec.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Analitika</h2>
          <p className="text-sm text-gray-500 mt-0.5">Pregled aktivnosti, financ in skladnosti za izbrani mesec</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="analytics-period" className="text-sm font-medium text-gray-600">Mesec:</label>
          <input
            id="analytics-period"
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {noData && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-400">
          Ni tahografskih ali urnik podatkov za {period}.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[
          { label: 'Ure vožnje',        value: fmtH(kpi.voznjaH),        icon: 'directions_car', bg: 'bg-blue-50',    ic: 'text-blue-600'   },
          { label: 'Ure dela',          value: fmtH(kpi.deloH),          icon: 'work',           bg: 'bg-purple-50',  ic: 'text-purple-600' },
          { label: 'Ure počitka',       value: fmtH(kpi.pocitekH),       icon: 'hotel',          bg: 'bg-green-50',   ic: 'text-green-600'  },
          { label: 'Aktivnih voznikov', value: kpi.aktivniVozniki,       icon: 'group',          bg: 'bg-amber-50',   ic: 'text-amber-600'  },
          { label: 'Aktivnih vozil',    value: kpi.aktivnaVozila,        icon: 'directions_bus', bg: 'bg-sky-50',     ic: 'text-sky-600'    },
          { label: 'Prevozov',          value: kpi.stPrevozov,           icon: 'add_road',       bg: 'bg-indigo-50',  ic: 'text-indigo-600' },
          { label: 'Skupaj vrednost',   value: fmtEur(kpi.skupnaVrednost), icon: 'euro',         bg: 'bg-emerald-50', ic: 'text-emerald-600'},
          { label: 'Neplačano',         value: fmtEur(kpi.neplacano),    icon: 'cancel',         bg: 'bg-red-50',     ic: 'text-red-500'    },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 ${c.bg} rounded-lg flex items-center justify-center shrink-0`}>
              <span className={`material-symbols-outlined ${c.ic} text-[20px]`}>{c.icon}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">{c.label}</p>
              <p className="text-lg font-bold text-gray-900 truncate">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-800 mb-1">Tedenska aktivnost</h3>
        <p className="text-xs text-gray-400 mb-4">Povprečne ure vožnje + dela po dnevu v tednu</p>
        <div className="h-64">
          <VBarChart data={weeklyPattern} color="#2563eb" labelKey="label" valueKey="value" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-800 mb-1">Dnevni trend po voznikih</h3>
        <p className="text-xs text-gray-400 mb-4">Ure vožnje in dela po dnevih — {period}</p>
        <div className="h-72">
          <VozilaLineGraf lines={driverDailyTrend} days={lastDay} />
        </div>
        {driverDailyTrend.length > 0 && (
          <div className="flex flex-wrap gap-4 mt-4">
            {driverDailyTrend.map((l, i) => (
              <div key={l.label} className="flex items-center gap-2 text-xs text-gray-600">
                <div className="w-6 h-2 rounded-full" style={{ backgroundColor: LINE_COLORS[i % LINE_COLORS.length] }} />
                <span>{l.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-800 mb-1">Ure po voznikih</h3>
        <div className="flex items-center gap-6 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600"><div className="w-4 h-4 rounded bg-blue-500" /> Vožnja</div>
          <div className="flex items-center gap-2 text-sm text-gray-600"><div className="w-4 h-4 rounded bg-orange-400" /> Delo</div>
        </div>
        {driverHours.length === 0
          ? <p className="text-sm text-gray-400 text-center py-6">Ni voznikov.</p>
          : (
            <div className="space-y-2">
              {driverHours.map((d) => (
                <DriverHBar key={d.name} name={d.name} voznja={d.voznja} delo={d.delo} maxTotal={driverHours[0].total || 1} />
              ))}
            </div>
          )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-800 mb-1">Ure po vozilih</h3>
        <p className="text-xs text-gray-400 mb-4">Skupne ure (VOZNJA + DELO) po vozilu</p>
        {vehicleHours.length === 0
          ? <p className="text-sm text-gray-400 text-center py-6">Ni tahografskih zapisov z registrsko številko.</p>
          : (
            <div className="space-y-2">
              {vehicleHours.map((v) => (
                <HBar key={v.registerska} label={v.registerska} value={v.total} max={vehicleHours[0].total} color="#0284c7" unit="h" />
              ))}
            </div>
          )}
      </div>

      <ComplianceTable compliance={compliance} />

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-800 mb-1">Vožnje po mesecih</h3>
        <p className="text-xs text-gray-400 mb-4">Število ročno vnesenih voženj v zadnjih 12 mesecih</p>
        <div className="h-64">
          {voznjePoMesecih.length > 0
            ? <VBarChart data={voznjePoMesecih} color="#2563eb" labelKey="label" valueKey="value" />
            : <div className="flex items-center justify-center h-full text-gray-400 text-sm">Ni podatkov.</div>}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Dnevna stanja voznika</h3>
            <p className="text-xs text-gray-400 mt-0.5">Razporeditev aktivnosti po dnevih — {period}</p>
          </div>
          <select
            value={selectedVoznikStanje}
            onChange={(e) => setSelectedVoznikStanje(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Izberi voznika —</option>
            {stanjeVoznikiOptions.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
        {!selectedVoznikStanje
          ? <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Izberi voznika za prikaz.</div>
          : <DnevnaStanjaGraf stanjeByVoznik={stanjeByVoznik} />}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-800 mb-1">Prihodki – zadnjih 6 mesecev</h3>
        {monthlyRevenueTrend.length > 0 && (() => {
          const fmt = (m) => new Date(m + '-01').toLocaleDateString('sl-SI', { month: 'long', year: 'numeric' });
          return (
            <p className="text-xs text-gray-400 mb-3">
              {fmt(monthlyRevenueTrend[0]._month)} – {fmt(monthlyRevenueTrend[monthlyRevenueTrend.length - 1]._month)}
            </p>
          );
        })()}
        <div className="h-96">
          {monthlyRevenueTrend.length > 0
            ? <VBarChart data={monthlyRevenueTrend} color="#059669" color2="#059669" labelKey="label" valueKey="value" value2Key="value2" />
            : <p className="text-xs text-gray-400 text-center pt-8">Ni podatkov o prihodkih.</p>}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-1">Top stranke — {period}</h3>
          <p className="text-xs text-gray-400 mb-3">Vrednost prevozov po stranki</p>
          {topStranke.length === 0
            ? <p className="text-xs text-gray-400 text-center py-4">Ni prevozov z znano stranko.</p>
            : (
              <div className="space-y-2.5">
                {topStranke.map((s) => {
                  const neplacano = Math.round((s.value - s.value2) * 100) / 100;
                  return (
                    <div key={s.label} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-28 truncate shrink-0 text-right">{s.label}</span>
                      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden relative">
                        <div className="h-full rounded-full bg-emerald-500 absolute left-0"
                          style={{ width: `${(s.value / topStranke[0].value) * 100}%` }} />
                        <div className="h-full rounded-full bg-gray-300 absolute left-0"
                          style={{ width: `${(neplacano / topStranke[0].value) * 100}%`, opacity: 0.6 }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 w-20 text-right shrink-0">{fmtEur(s.value)}</span>
                    </div>
                  );
                })}
              </div>
            )}
      </div>
    </div>
  );
}