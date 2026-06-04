import { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import Sidebar from '../components/Sidebar';
import api from '../api/client';
import 'leaflet/dist/leaflet.css';

const startIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const endIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const ROUTE_COLORS = ['#2563eb', '#f97316', '#8b5cf6', '#10b981', '#ef4444'];
const geocodeCache = new Map();

const UNKNOWN_VALUES = new Set(['neznano', 'unknown', '-', '']);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const formatDurationLabel = (start, end) => {
  if (!start || !end) return '-';
  const diffMinutes = Math.floor((new Date(end) - new Date(start)) / 60000);
  if (!Number.isFinite(diffMinutes) || diffMinutes <= 0) return '-';
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}min`;
};

const parseRelacija = (relacija) => {
  if (!relacija || typeof relacija !== 'string') {
    return { from: 'Neznano', to: 'Neznano' };
  }

  const separators = [' -> ', '->', ' → ', '→'];
  for (const sep of separators) {
    const idx = relacija.indexOf(sep);
    if (idx !== -1) {
      const from = relacija.slice(0, idx).trim();
      const to = relacija.slice(idx + sep.length).trim();
      return {
        from: from || 'Neznano',
        to: to || 'Neznano',
      };
    }
  }

  const value = relacija.trim();
  return { from: value || 'Neznano', to: 'Neznano' };
};

function FitRouteBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points?.length > 1) {
      map.fitBounds(points, { padding: [30, 30] });
    }
  }, [map, points]);
  return null;
}

const geocodeLocation = async (locationName) => {
  const normalized = String(locationName || '').trim();

  if (!normalized || UNKNOWN_VALUES.has(normalized.toLowerCase())) return null;
  if (normalized.includes('→') || normalized.includes('->')) return null;

  if (geocodeCache.has(normalized)) return geocodeCache.get(normalized);

  try {
    const res = await fetch(
      `/nominatim/search?format=jsonv2&limit=1&addressdetails=1&countrycodes=si&q=${encodeURIComponent(normalized + ', Slovenia')}`
    );

    if (res.status === 429) {
      console.warn(`Nominatim rate limit hit for "${normalized}" — retry after 2s`);
      await sleep(2000);
      const retry = await fetch(
        `/nominatim/search?format=jsonv2&limit=1&addressdetails=1&countrycodes=si&q=${encodeURIComponent(normalized + ', Slovenia')}`
      );
      if (!retry.ok) {
        geocodeCache.set(normalized, null);
        return null;
      }
      const retryData = await retry.json();
      if (retryData.length > 0) {
        const result = [parseFloat(retryData[0].lat), parseFloat(retryData[0].lon)];
        geocodeCache.set(normalized, result);
        return result;
      }
      geocodeCache.set(normalized, null);
      return null;
    }

    if (!res.ok) {
      console.warn(`Geocode failed for "${normalized}" — status ${res.status}`);
      geocodeCache.set(normalized, null);
      return null;
    }

    const data = await res.json();
    if (data.length > 0) {
      const result = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      geocodeCache.set(normalized, result);
      return result;
    }
  } catch (err) {
    console.error(`Geocode error for "${locationName}":`, err);
  }

  geocodeCache.set(normalized, null);
  return null;
};

const fetchOsrmRoute = async (fromCoords, toCoords) => {
  try {
    const res = await fetch(
      `/osrm/route/v1/car/` +
      `${fromCoords[1]},${fromCoords[0]};${toCoords[1]},${toCoords[0]}` +
      `?overview=full&geometries=geojson`
    );
    const data = await res.json();
    if (data.routes?.length > 0) {
      const route = data.routes[0];
      return {
        distance: (route.distance / 1000).toFixed(1),
        duration: (route.duration / 3600).toFixed(2),
        coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      };
    }
  } catch (err) {
    console.error('OSRM error:', err);
  }
  return null;
};

const PLACEHOLDER_RIDES = [
  { id: 'LJ-BUS-RENA-01', driver: 'Marko Novak',    km: 420.5, hours: '8h 15min', consumption: 28.4, status: 'voznji',  location: 'Ljubljana' },
  { id: 'MB-SIRENA-02',   driver: 'Janez Potočnik', km: 150.0, hours: '2h 45min', consumption: 31.2, status: 'počitek', location: 'Maribor'   },
  { id: 'KP-SIRENA-03',   driver: 'Luka Horvat',    km: 358.2, hours: '6h 30min', consumption: 29.1, status: 'voznji',  location: 'Koper'     },
];

const PLACEHOLDER_ALERTS = [
  { id: 1, type: 'warning', title: 'Prekoračitev časa vožnje', description: 'Voznik Marko Novak - Pred 15 min', icon: 'warning'           },
  { id: 2, type: 'info',    title: 'Nizek nivo goriva',        description: 'MB-SIRENA-02 - Pred 1h',           icon: 'local_gas_station' },
  { id: 3, type: 'success', title: 'Servis uspešno opravljen', description: 'KP-SIRENA-03 - Pred 4h',           icon: 'check_circle'      },
];

function StatCard({ label, value, unit, iconName, bgColor, iconColor, trend }) {
  return (
    <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0">
          <p className="text-gray-600 text-xs font-semibold mb-2 uppercase tracking-wide">{label}</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>
          {unit && <p className="text-sm text-gray-500 mt-1">{unit}</p>}
        </div>
        <div className={`w-10 h-10 sm:w-12 sm:h-12 ${bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <span className={`material-symbols-outlined ${iconColor} text-sm sm:text-base`}>{iconName}</span>
        </div>
      </div>
      {trend && <p className="text-sm text-green-600 font-semibold">{trend}</p>}
    </div>
  );
}

function RouteCard({ route, color, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full p-3 rounded-lg border text-sm text-left transition-colors ${selected ? 'ring-2 ring-blue-500' : ''}`}
      style={{ backgroundColor: `${color}10`, borderColor: `${color}40` }}
    >
      <p className="font-semibold text-gray-900">{route.vehicle}</p>
      <p className="text-xs text-gray-600 mt-1">{route.driver}</p>
      <div className="flex items-center gap-2 mt-2 text-xs text-gray-700">
        <span className="material-symbols-outlined text-sm">location_on</span>
        <span className="truncate">{route.from}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-700">
        <span className="material-symbols-outlined text-sm">arrow_forward</span>
        <span className="truncate">{route.to}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-200">
        <div>
          <p className="text-xs text-gray-500">Trajanje</p>
          <p className="font-bold text-gray-900">{route.durationLabel || '-'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Vozilo</p>
          <p className="font-bold text-gray-900">{route.vehicle || '-'}</p>
        </div>
      </div>
      <span className={`inline-block mt-3 px-2 py-1 rounded text-xs font-medium ${
        route.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
      }`}>
        {route.status === 'completed' ? 'Končano' : 'Načrtovano'}
      </span>
    </button>
  );
}

function RoutesMap({ selectedRoute, loading }) {
  const defaultCenter = [46.15, 14.99];
  const defaultZoom = 8;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        <span className="material-symbols-outlined animate-spin mr-2">refresh</span>
        Nalaganje poti...
      </div>
    );
  }

  if (!selectedRoute) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        Izberi pot na desni za prikaz zemljevida.
      </div>
    );
  }

  if (!selectedRoute.fromCoords || !selectedRoute.toCoords) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm px-4 text-center">
        Za izbrano pot ni bilo mogoče izračunati geolokacije.
        <br />
        <span className="text-xs mt-1 block text-gray-400">
          ({selectedRoute.from} → {selectedRoute.to})
        </span>
      </div>
    );
  }

  return (
    <MapContainer
      key={selectedRoute.id}
      center={selectedRoute.fromCoords || defaultCenter}
      zoom={defaultZoom}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      {selectedRoute.coordinates && (
        <Polyline positions={selectedRoute.coordinates} color={ROUTE_COLORS[0]} weight={4} opacity={0.85} />
      )}
      {selectedRoute.coordinates && <FitRouteBounds points={selectedRoute.coordinates} />}
      <Marker position={selectedRoute.fromCoords} icon={startIcon}>
        <Popup><strong>{selectedRoute.from}</strong><br /><small>Start — {selectedRoute.driver}</small></Popup>
      </Marker>
      <Marker position={selectedRoute.toCoords} icon={endIcon}>
        <Popup><strong>{selectedRoute.to}</strong><br /><small>Cilj — {selectedRoute.vehicle || '-'}</small></Popup>
      </Marker>
    </MapContainer>
  );
}

const LINE_COLORS = ['#2563eb','#f97316','#10b981','#8b5cf6','#ef4444','#f59e0b','#06b6d4','#ec4899'];

// ─── Analytics constants ──────────────────────────────────────────────────────
const STANJE_COLORS = {
  VOZNJA:          '#1d4ed8',
  DELO:            '#6b21a8',
  POCITEK:         '#166534',
  ODMOR:           '#92400e',
  RAZPOLOZLJIVOST: '#c2410c',
  DRUGO:           '#6b7280',
  NEZNANO:         '#9ca3af',
};
const STANJE_LABELS = {
  VOZNJA:'Vožnja', DELO:'Delo', POCITEK:'Počitek',
  ODMOR:'Odmor', RAZPOLOZLJIVOST:'Razpoložljivost', DRUGO:'Drugo', NEZNANO:'Neznano',
};
const TEDEN = ['Pon','Tor','Sre','Čet','Pet','Sob','Ned'];
const fmtH = (h) => `${h.toFixed(1)}h`;
const fmtEur = (v) => new Intl.NumberFormat('sl-SI',{style:'currency',currency:'EUR'}).format(v ?? 0);

// ─── DonutChart ───────────────────────────────────────────────────────────────
function DonutChart({ segments, totalMin }) {
  const r = 65, cx = 110, cy = 110;
  const circ = 2 * Math.PI * r;
  const totalM = totalMin || 1;
  let cumFrac = 0;
  return (
    <svg viewBox="0 0 220 220" className="w-full h-full">
      {segments.map((seg) => {
        const frac = seg.mins / totalM;
        const dash = frac * circ;
        const rotation = -90 + cumFrac * 360;
        cumFrac += frac;
        return (
          <circle key={seg.stanje} cx={cx} cy={cy} r={r}
            fill="none" stroke={STANJE_COLORS[seg.stanje] || '#6b7280'}
            strokeWidth="30" strokeDasharray={`${dash} ${circ - dash}`}
            transform={`rotate(${rotation} ${cx} ${cy})`} />
        );
      })}
      <circle cx={cx} cy={cy} r={50} fill="white" />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="16" fontWeight="bold" fill="#111827">
        {fmtH(totalMin / 60)}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="11" fill="#9ca3af">skupaj</text>
    </svg>
  );
}

// ─── DriverHBar — stacked vožnja (blue) + delo (orange) ──────────────────────
function DriverHBar({ name, voznja, delo, maxTotal }) {
  const max = maxTotal || 1;
  const vPct = (voznja / max) * 100;
  const dPct = (delo / max) * 100;
  const hasData = voznja > 0 || delo > 0;
  return (
    <div className="flex items-center gap-3 py-0.5">
      <span className="text-xs text-gray-600 w-32 truncate shrink-0 text-right">{name}</span>
      <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden flex">
        {vPct > 0 && <div style={{ width: `${vPct}%` }} className="h-full bg-blue-500 shrink-0 transition-all" />}
        {dPct > 0 && <div style={{ width: `${dPct}%` }} className="h-full bg-orange-400 shrink-0 transition-all" />}
      </div>
      {hasData
        ? <div className="text-right shrink-0 w-28">
            <span className="text-[11px] text-blue-600 font-semibold">{voznja}h</span>
            <span className="text-gray-300 mx-1">|</span>
            <span className="text-[11px] text-orange-500 font-semibold">{delo}h</span>
          </div>
        : <span className="text-[11px] text-gray-300 w-28 text-right shrink-0">—</span>}
    </div>
  );
}

// ─── HBar (simple single color, used for vehicles) ────────────────────────────
function HBar({ label, value, max, color = '#0284c7', unit = 'h' }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3 py-0.5">
      <span className="text-xs text-gray-600 w-32 truncate shrink-0 text-right">{label}</span>
      <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
        <div className="h-full rounded transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-14 text-right shrink-0">{value}{unit}</span>
    </div>
  );
}

// ─── VBar chart (vertical bars) ───────────────────────────────────────────────
function VBarChart({ data, color = '#2563eb', color2, labelKey = 'label', valueKey = 'value', value2Key }) {
  if (!data.length) return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Ni podatkov.</div>;
  const maxV = Math.max(1, ...data.map(d => d[valueKey] + (value2Key ? (d[value2Key] ?? 0) : 0)));
  const W = 1000, H = 260, PAD_L = 10, PAD_B = 40, PAD_T = 20;
  const gH = H - PAD_B - PAD_T;
  const bW = Math.min(55, (W - PAD_L) / data.length - 6);
  const spacing = (W - PAD_L) / data.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <rect width={W} height={H} fill="white" />
      {[0, 0.25, 0.5, 0.75, 1].map(f => {
        const y = PAD_T + gH - f * gH;
        const v = Math.round(maxV * f * 10) / 10;
        return (
          <g key={f}>
            <line x1={PAD_L} y1={y} x2={W} y2={y} stroke="#f3f4f6" strokeWidth="1" />
            <text x={PAD_L + 2} y={y - 3} fontSize="10" fill="#d1d5db">{v}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const x = PAD_L + i * spacing + (spacing - bW) / 2;
        const h1 = (d[valueKey] / maxV) * gH;
        const h2 = value2Key ? ((d[value2Key] ?? 0) / maxV) * gH : 0;
        const y1 = PAD_T + gH - h1;
        return (
          <g key={d[labelKey]}>
            {value2Key && h2 > 0 && (
              <rect x={x} y={y1 - h2} width={bW} height={h2} fill={color2 || '#6b21a8'} rx="3" opacity="0.6" />
            )}
            {h1 > 0 && <rect x={x} y={y1} width={bW} height={h1} fill={color} rx="3" />}
            {(h1 + h2) > 0 && (
              <text x={x + bW / 2} y={y1 - h2 - 3} fontSize="10" fill="#374151" textAnchor="middle" fontWeight="bold">
                {Math.round((d[valueKey] + (value2Key ? (d[value2Key] ?? 0) : 0)) * 10) / 10}
              </text>
            )}
            <text x={x + bW / 2} y={H - PAD_B + 14} fontSize="10" fill="#6b7280" textAnchor="middle">{d[labelKey]}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Line chart ───────────────────────────────────────────────────────────────
function SimpleLineChart({ data, labelKey = 'label', valueKey = 'value', color = '#2563eb' }) {
  if (!data.length) return null;
  const maxV = Math.max(1, ...data.map(d => d[valueKey]));
  const W = 1000, H = 220, PAD_L = 50, PAD_R = 10, PAD_T = 20, PAD_B = 30;
  const gW = W - PAD_L - PAD_R, gH = H - PAD_T - PAD_B;
  const xP = (i) => PAD_L + (i / (data.length - 1 || 1)) * gW;
  const yP = (v) => PAD_T + gH - (v / maxV) * gH;
  const pts = data.map((d, i) => `${xP(i)},${yP(d[valueKey])}`).join(' ');
  const labels = data.filter((_, i) => i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 8) === 0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <rect width={W} height={H} fill="white" />
      {[0, 0.5, 1].map(f => {
        const y = yP(maxV * f);
        return (
          <g key={f}>
            <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#f3f4f6" strokeWidth="1" />
            <text x={PAD_L - 4} y={y + 4} fontSize="11" fill="#9ca3af" textAnchor="end">{Math.round(maxV * f * 10) / 10}</text>
          </g>
        );
      })}
      <line x1={PAD_L} y1={PAD_T + gH} x2={W - PAD_R} y2={PAD_T + gH} stroke="#e5e7eb" strokeWidth="1" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => d[valueKey] > 0 && (
        <circle key={i} cx={xP(i)} cy={yP(d[valueKey])} r="3" fill={color} />
      ))}
      {labels.map((d, _) => {
        const i = data.indexOf(d);
        return <text key={i} x={xP(i)} y={H - PAD_B + 14} fontSize="10" fill="#9ca3af" textAnchor="middle">{d[labelKey]}</text>;
      })}
    </svg>
  );
}

// ─── Analytics Tab ────────────────────────────────────────────────────────────
function AnalyticsTab() {
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [tahData, setTahData] = useState([]);
  const [urnikData, setUrnikData] = useState([]);
  const [voznikiList, setVoznikiList] = useState([]);
  const [voznjeAll, setVoznjeAll] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVoznikStanje, setSelectedVoznikStanje] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [yr, mo] = period.split('-').map(Number);
        const od = `${period}-01`;
        const lastDay = new Date(yr, mo, 0).getDate();
        const doDate = `${period}-${String(lastDay).padStart(2, '0')}`;
        const [tahRes, urnikRes, voznikiRes, voznjeRes] = await Promise.all([
          api.get(`/admin/tahograf?od=${od}&do=${doDate}`),
          api.get('/admin/urnik'),
          api.get('/admin/vozniki'),
          api.get('/admin/voznje'),
        ]);
        setTahData(tahRes.data || []);
        setUrnikData(urnikRes.data || []);
        setVoznikiList(voznikiRes.data || []);
        setVoznjeAll(voznjeRes.data || []);
      } catch {
        setTahData([]); setUrnikData([]); setVoznikiList([]); setVoznjeAll([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period]);

  const [yr, mo] = period.split('-').map(Number);
  const lastDay = new Date(yr, mo, 0).getDate();

  const urnikMesec = useMemo(() =>
    urnikData.filter(u => { const d = new Date(u.datum); return d.getFullYear() === yr && d.getMonth() + 1 === mo; }),
    [urnikData, yr, mo]);

  const kpi = useMemo(() => {
    const voznjaMin = tahData.filter(z => z.stanje === 'VOZNJA').reduce((s, z) => s + (z.trajanje_min ?? 0), 0);
    const deloMin   = tahData.filter(z => z.stanje === 'DELO').reduce((s, z) => s + (z.trajanje_min ?? 0), 0);
    const pocitekMin = tahData.filter(z => z.stanje === 'POCITEK').reduce((s, z) => s + (z.trajanje_min ?? 0), 0);
    const aktivniVozniki = new Set(tahData.map(z => z.fk_uporabnik)).size;
    const aktivnaVozila = new Set(tahData.map(z => z.registrska).filter(Boolean)).size;
    const skupnaVrednost = urnikMesec.filter(u => u.cena != null).reduce((s, u) => s + u.cena, 0);
    const neplacano = urnikMesec.filter(u => !u.placano && u.cena != null).reduce((s, u) => s + u.cena, 0);
    const stPrevozov = urnikMesec.length;
    return { voznjaH: voznjaMin/60, deloH: deloMin/60, pocitekH: pocitekMin/60, aktivniVozniki, aktivnaVozila, skupnaVrednost, neplacano, stPrevozov };
  }, [tahData, urnikMesec]);

  const driverHours = useMemo(() => {
    const map = {};
    // seed all known vozniki with 0 so they always appear
    voznikiList.forEach(v => {
      const name = `${v.priimek} ${v.ime[0]}.`;
      map[v.id_uporabnik] = { name, v: 0, d: 0 };
    });
    tahData.filter(z => z.stanje === 'VOZNJA' || z.stanje === 'DELO').forEach(z => {
      const k = z.fk_uporabnik;
      if (!map[k]) {
        const name = z.uporabnik ? `${z.uporabnik.priimek} ${z.uporabnik.ime[0]}.` : `ID ${k}`;
        map[k] = { name, v: 0, d: 0 };
      }
      if (z.stanje === 'VOZNJA') map[k].v += z.trajanje_min ?? 0;
      else map[k].d += z.trajanje_min ?? 0;
    });
    return Object.values(map)
      .map(x => ({ name: x.name, voznja: Math.round(x.v/60*10)/10, delo: Math.round(x.d/60*10)/10, total: Math.round((x.v+x.d)/60*10)/10 }))
      .sort((a, b) => b.total - a.total);
  }, [tahData, voznikiList]);

  const vehicleHours = useMemo(() => {
    const map = {};
    tahData.filter(z => z.registrska && (z.stanje === 'VOZNJA' || z.stanje === 'DELO')).forEach(z => {
      if (!map[z.registrska]) map[z.registrska] = { v: 0, d: 0 };
      if (z.stanje === 'VOZNJA') map[z.registrska].v += z.trajanje_min ?? 0;
      else map[z.registrska].d += z.trajanje_min ?? 0;
    });
    return Object.entries(map)
      .map(([reg, x]) => ({ registerska: reg, voznja: Math.round(x.v/60*10)/10, delo: Math.round(x.d/60*10)/10, total: Math.round((x.v+x.d)/60*10)/10 }))
      .sort((a, b) => b.total - a.total);
  }, [tahData]);

  const driverDailyTrend = useMemo(() => {
    const map = {};
    tahData.filter(z => z.stanje === 'VOZNJA' || z.stanje === 'DELO').forEach(z => {
      const k = z.fk_uporabnik;
      const name = z.uporabnik ? `${z.uporabnik.priimek} ${z.uporabnik.ime[0]}.` : `ID ${k}`;
      if (!map[k]) map[k] = { label: name, dnevno: Array(lastDay).fill(0) };
      const day = new Date(z.zacetek).getDate();
      if (day >= 1 && day <= lastDay) map[k].dnevno[day - 1] += (z.trajanje_min ?? 0) / 60;
    });
    return Object.values(map)
      .map(x => ({ ...x, dnevno: x.dnevno.map(h => Math.round(h * 10) / 10) }))
      .filter(x => x.dnevno.some(h => h > 0))
      .sort((a, b) => b.dnevno.reduce((s, h) => s + h, 0) - a.dnevno.reduce((s, h) => s + h, 0));
  }, [tahData, lastDay]);

  const weeklyPattern = useMemo(() => {
    const sums = Array(7).fill(0), cnt = Array(7).fill(0);
    tahData.filter(z => z.stanje === 'VOZNJA' || z.stanje === 'DELO').forEach(z => {
      const dow = (new Date(z.zacetek).getDay() + 6) % 7;
      sums[dow] += (z.trajanje_min ?? 0) / 60;
      cnt[dow]++;
    });
    return TEDEN.map((label, i) => ({ label, value: cnt[i] > 0 ? Math.round(sums[i] / cnt[i] * 10) / 10 : 0 }));
  }, [tahData]);

  const topStranke = useMemo(() => {
    const map = {};
    urnikMesec.filter(u => u.cena != null && u.stranka).forEach(u => {
      const n = u.stranka.naziv || '—';
      if (!map[n]) map[n] = { skupaj: 0, placano: 0 };
      map[n].skupaj += u.cena;
      if (u.placano) map[n].placano += u.cena;
    });
    return Object.entries(map)
      .map(([naziv, x]) => ({ label: naziv, value: Math.round(x.skupaj*100)/100, value2: Math.round(x.placano*100)/100 }))
      .sort((a, b) => b.value - a.value).slice(0, 7);
  }, [urnikMesec]);

  const compliance = useMemo(() => {
    const map = {};
    tahData.filter(z => z.stanje === 'VOZNJA').forEach(z => {
      const k = z.fk_uporabnik;
      const name = z.uporabnik ? `${z.uporabnik.priimek} ${z.uporabnik.ime[0]}.` : `ID ${k}`;
      const day = new Date(z.zacetek).toISOString().slice(0, 10);
      if (!map[k]) map[k] = { name, days: {} };
      map[k].days[day] = (map[k].days[day] || 0) + (z.trajanje_min ?? 0) / 60;
    });
    return Object.values(map).map(x => {
      const vals = Object.values(x.days);
      return { name: x.name, maxDnevno: Math.round(Math.max(0, ...vals) * 10) / 10, presezkov: vals.filter(h => h > 9).length, dni: vals.length };
    }).sort((a, b) => b.presezkov - a.presezkov || b.maxDnevno - a.maxDnevno);
  }, [tahData]);

  // "Vožnje po mesecih" — count of manually entered trips per month (last 12)
  const voznjePoMesecih = useMemo(() => {
    const map = {};
    voznjeAll.forEach(v => {
      const key = new Date(v.zacetek).toISOString().slice(0, 7);
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([mesec, stevilo]) => ({
        label: new Date(mesec + '-01').toLocaleDateString('sl-SI', { month: 'short', year: '2-digit' }),
        value: stevilo,
      }));
  }, [voznjeAll]);

  // Per-driver stanje breakdown for selected period (MesecniPregled)
  const stanjeByVoznik = useMemo(() => {
    if (!selectedVoznikStanje) return [];
    const id = parseInt(selectedVoznikStanje);
    const [year, month] = period.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const dnevno = {};
    for (let i = 1; i <= daysInMonth; i++) {
      dnevno[i] = { VOZNJA: 0, DELO: 0 };
    }
    tahData.filter(z => z.fk_uporabnik === id && (z.stanje === 'VOZNJA' || z.stanje === 'DELO')).forEach(z => {
      const d = new Date(z.zacetek).getDate();
      if (dnevno[d]) dnevno[d][z.stanje] += (z.trajanje_min ?? 0) / 60;
    });
    return Object.entries(dnevno).map(([dan, s]) => ({
      dan: parseInt(dan),
      voznja: Math.round(s.VOZNJA * 100) / 100,
      delo: Math.round(s.DELO * 100) / 100,
    }));
  }, [tahData, selectedVoznikStanje, period]);

  const stanjeVoznikiOptions = useMemo(() =>
    Array.from(new Map(tahData.map(z => [z.fk_uporabnik, z.uporabnik])).entries())
      .map(([id, u]) => ({ id, name: u ? `${u.ime} ${u.priimek}` : `ID ${id}` }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [tahData]);

  const monthlyRevenueTrend = useMemo(() => {
    const map = {};
    urnikData.filter(u => u.cena != null).forEach(u => {
      const key = new Date(u.datum).toISOString().slice(0, 7);
      if (!map[key]) map[key] = { skupaj: 0, placano: 0 };
      map[key].skupaj += u.cena;
      if (u.placano) map[key].placano += u.cena;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-6)
      .map(([m, x]) => ({ label: m.slice(5) + '/' + m.slice(2, 4), value: Math.round(x.skupaj*100)/100, value2: Math.round(x.placano*100)/100 }));
  }, [urnikData]);

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
      {/* Header + period */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Analitika</h2>
          <p className="text-sm text-gray-500 mt-0.5">Pregled aktivnosti, financ in skladnosti za izbrani mesec</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Mesec:</label>
          <input type="month" value={period} onChange={e => setPeriod(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {noData && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-400">
          Ni tahografskih ali urnik podatkov za {period}.
        </div>
      )}

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[
          { label: 'Ure vožnje',      value: fmtH(kpi.voznjaH),         icon: 'directions_car', bg: 'bg-blue-50',   ic: 'text-blue-600' },
          { label: 'Ure dela',        value: fmtH(kpi.deloH),            icon: 'work',           bg: 'bg-purple-50', ic: 'text-purple-600' },
          { label: 'Ure počitka',     value: fmtH(kpi.pocitekH),         icon: 'hotel',          bg: 'bg-green-50',  ic: 'text-green-600' },
          { label: 'Aktivnih voznikov', value: kpi.aktivniVozniki,        icon: 'group',          bg: 'bg-amber-50',  ic: 'text-amber-600' },
          { label: 'Aktivnih vozil',  value: kpi.aktivnaVozila,           icon: 'directions_bus', bg: 'bg-sky-50',    ic: 'text-sky-600' },
          { label: 'Prevozov',        value: kpi.stPrevozov,              icon: 'add_road',       bg: 'bg-indigo-50', ic: 'text-indigo-600' },
          { label: 'Skupaj vrednost', value: fmtEur(kpi.skupnaVrednost),  icon: 'euro',           bg: 'bg-emerald-50',ic: 'text-emerald-600' },
          { label: 'Neplačano',       value: fmtEur(kpi.neplacano),       icon: 'cancel',         bg: 'bg-red-50',    ic: 'text-red-500' },
        ].map(c => (
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

      {/* ── Weekly pattern (full width) ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-800 mb-1">Tedenska aktivnost</h3>
        <p className="text-xs text-gray-400 mb-4">Povprečne ure vožnje + dela po dnevu v tednu</p>
        <div className="h-64">
          <VBarChart data={weeklyPattern} color="#2563eb" labelKey="label" valueKey="value" />
        </div>
      </div>

      {/* ── Daily trend per driver ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-800 mb-1">Dnevni trend po voznikih</h3>
        <p className="text-xs text-gray-400 mb-4">
          Ure vožnje in dela (DELO + VOZNJA) po dnevih — {period}
          {driverDailyTrend.length === 0 && ' · ni podatkov'}
        </p>
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

      {/* ── Driver hours ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-800 mb-1">Ure po voznikih</h3>
        <div className="flex items-center gap-6 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-4 h-4 rounded bg-blue-500" /> Vožnja
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-4 h-4 rounded bg-orange-400" /> Delo
          </div>
        </div>
        {driverHours.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Ni voznikov.</p>
        ) : (
          <div className="space-y-2">
            {driverHours.map(d => (
              <DriverHBar key={d.name} name={d.name} voznja={d.voznja} delo={d.delo}
                maxTotal={driverHours[0].total || 1} />
            ))}
          </div>
        )}
      </div>

      {/* ── Vehicle hours ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-800 mb-1">Ure po vozilih</h3>
        <p className="text-xs text-gray-400 mb-4">Skupne ure vožnje in dela (VOZNJA + DELO) po vozilu</p>
        {vehicleHours.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Ni tahografskih zapisov z registrsko številko.</p>
        ) : (
          <div className="space-y-2">
            {vehicleHours.map(v => (
              <HBar key={v.registerska} label={v.registerska} value={v.total}
                max={vehicleHours[0].total} color="#0284c7" unit="h" />
            ))}
          </div>
        )}
      </div>

      {/* ── Driver compliance ── */}
      {compliance.length > 0 && (
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
                {compliance.map(c => (
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
                        : <span className="inline-flex items-center gap-1 text-emerald-600"><span className="material-symbols-outlined text-[13px]">check_circle</span>Skladna</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Vožnje po mesecih ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-800 mb-1">Vožnje po mesecih</h3>
        <p className="text-xs text-gray-400 mb-4">Število ročno vnesenih voženj v zadnjih 12 mesecih</p>
        <div className="h-64">
          {voznjePoMesecih.length > 0
            ? <VBarChart data={voznjePoMesecih} color="#2563eb" labelKey="label" valueKey="value" />
            : <div className="flex items-center justify-center h-full text-gray-400 text-sm">Ni podatkov o vožnjah.</div>}
        </div>
      </div>

      {/* ── Dnevna stanja po voznikih (MesecniPregled) ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Dnevna stanja voznika</h3>
            <p className="text-xs text-gray-400 mt-0.5">Razporeditev aktivnosti po dnevih — {period}</p>
          </div>
          <select value={selectedVoznikStanje} onChange={e => setSelectedVoznikStanje(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">— Izberi voznika —</option>
            {stanjeVoznikiOptions.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        {!selectedVoznikStanje ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Izberi voznika za prikaz.</div>
        ) : stanjeByVoznik.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Ni tahografskih zapisov za ta mesec.</div>
        ) : (
          <>
            <div className="h-72">
              <svg viewBox={`0 0 1200 300`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                <rect width="1200" height="300" fill="white" />
                {(() => {
                  const maxH = Math.max(1, ...stanjeByVoznik.map(d => d.voznja + d.delo));
                  const bW = Math.min(28, 1100 / stanjeByVoznik.length - 4);
                  const sp = 1100 / stanjeByVoznik.length;
                  const PAD_L = 60, PAD_T = 20, gH = 240;
                  const yP = v => PAD_T + gH - (v / maxH) * gH;
                  const STACKED = [
                    { key: 'delo',   color: '#f97316' },
                    { key: 'voznja', color: '#1d4ed8' },
                  ];
                  return (
                    <>
                      {[0, 0.25, 0.5, 0.75, 1].map(f => {
                        const y = yP(maxH * f);
                        return (
                          <g key={f}>
                            <line x1={PAD_L} y1={y} x2={1190} y2={y} stroke="#f3f4f6" strokeWidth="1" />
                            <text x={PAD_L - 4} y={y + 4} fontSize="10" fill="#9ca3af" textAnchor="end">{Math.round(maxH*f*10)/10}h</text>
                          </g>
                        );
                      })}
                      {stanjeByVoznik.map((d, i) => {
                        const x = PAD_L + i * sp + (sp - bW) / 2;
                        let yTop = PAD_T + gH;
                        return (
                          <g key={d.dan}>
                            {STACKED.map(({ key, color }) => {
                              const h = (d[key] / maxH) * gH;
                              if (h <= 0) return null;
                              yTop -= h;
                              return <rect key={key} x={x} y={yTop} width={bW} height={h} fill={color} />;
                            })}
                            {(i === 0 || i % 3 === 0 || i === stanjeByVoznik.length - 1) && (
                              <text x={x + bW / 2} y={PAD_T + gH + 14} fontSize="10" fill="#9ca3af" textAnchor="middle">{d.dan}</text>
                            )}
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            </div>
            <div className="flex flex-wrap gap-4 mt-3">
              {[
                { color: '#1d4ed8', label: 'Vožnja' },
                { color: '#f97316', label: 'Delo' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
                  {s.label}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Financial: monthly trend + top stranke ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-1">Prihodki – zadnjih 6 mesecev</h3>
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500"><div className="w-3 h-2 rounded-sm bg-emerald-600" /> Skupaj</div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500"><div className="w-3 h-2 rounded-sm bg-emerald-600 opacity-50" /> Plačano</div>
          </div>
          <div className="h-64">
            {monthlyRevenueTrend.length > 0
              ? <VBarChart data={monthlyRevenueTrend} color="#059669" color2="#059669" labelKey="label" valueKey="value" value2Key="value2" />
              : <p className="text-xs text-gray-400 text-center pt-8">Ni podatkov o prihodkih.</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-1">Top stranke — {period}</h3>
          <p className="text-xs text-gray-400 mb-3">Vrednost prevozov po stranki (sivo = neplačano)</p>
          {topStranke.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Ni prevozov z znano stranko za ta mesec.</p>
          ) : (
            <div className="space-y-2.5">
              {topStranke.map(s => {
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
    </div>
  );
}

function VozilaLineGraf({ lines, days }) {
  if (!lines.length) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Ni podatkov za izbrani mesec.
      </div>
    );
  }

  const allValues = lines.flatMap((l) => l.dnevno);
  const maxUre = Math.max(1, ...allValues);
  const W = 1200, H = 300, PAD_L = 70, PAD_R = 20, PAD_T = 20, PAD_B = 40;
  const gW = W - PAD_L - PAD_R;
  const gH = H - PAD_T - PAD_B;

  const xPos = (day) => PAD_L + ((day - 1) / (days - 1 || 1)) * gW;
  const yPos = (ure) => PAD_T + gH - (ure / maxUre) * gH;

  const yLabels = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <rect width={W} height={H} fill="white" />

      {/* Grid + Y labels */}
      {yLabels.map((frac) => {
        const val = Math.round(maxUre * frac * 10) / 10;
        const y = yPos(maxUre * frac);
        return (
          <g key={frac}>
            <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#f3f4f6" strokeWidth="1" />
            <text x={PAD_L - 6} y={y + 4} fontSize="11" fill="#9ca3af" textAnchor="end">{val}h</text>
          </g>
        );
      })}

      {/* Axes */}
      <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + gH} stroke="#e5e7eb" strokeWidth="1" />
      <line x1={PAD_L} y1={PAD_T + gH} x2={W - PAD_R} y2={PAD_T + gH} stroke="#e5e7eb" strokeWidth="1" />

      {/* X day labels — every 3rd day */}
      {Array.from({ length: days }, (_, i) => i + 1)
        .filter((d) => d === 1 || d % 3 === 0 || d === days)
        .map((d) => (
          <text key={d} x={xPos(d)} y={H - PAD_B + 14} fontSize="11" fill="#9ca3af" textAnchor="middle">{d}</text>
        ))}

      {/* Lines */}
      {lines.map((line, li) => {
        const color = LINE_COLORS[li % LINE_COLORS.length];
        const key = line.label ?? line.registerska;
        const points = Array.from({ length: days }, (_, i) => {
          const d = i + 1;
          return `${xPos(d)},${yPos(line.dnevno[i] ?? 0)}`;
        }).join(' ');
        return (
          <g key={key}>
            <polyline points={points} fill="none" stroke={color} strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" />
            {Array.from({ length: days }, (_, i) => i + 1)
              .filter((d) => (line.dnevno[d - 1] ?? 0) > 0)
              .map((d) => (
                <circle key={d} cx={xPos(d)} cy={yPos(line.dnevno[d - 1])} r="3" fill={color} />
              ))}
          </g>
        );
      })}
    </svg>
  );
}

export default function Dashboard() {
  const [statistics, setStatistics] = useState({
    totalHours: 0,
    totalKm: 0,
    activeDrivers: 0,
    totalDrivers: 0,
  });
  const [urnikAll, setUrnikAll] = useState([]);
  const [totalVozniki, setTotalVozniki] = useState(0);
  const [dashTahData, setDashTahData] = useState([]);
  const [dashLoading, setDashLoading] = useState(true);

  const [selectedMonthUre, setSelectedMonthUre] = useState(() => new Date().toISOString().slice(0, 7));
  const [skupneUre, setSkupneUre] = useState(null);
  const [ureLoading, setUreLoading] = useState(false);

  const [selectedMonthVozila, setSelectedMonthVozila] = useState(() => new Date().toISOString().slice(0, 7));
  const [vozilaLines, setVozilaLines] = useState([]);
  const [vozilaGrafDays, setVozilaGrafDays] = useState(30);
  const [vozilaLoading, setVozilaLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState('');
  const [routes, setRoutes] = useState([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [routesError, setRoutesError] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [selectedRouteMapData, setSelectedRouteMapData] = useState(null);
  const [selectedRouteLoading, setSelectedRouteLoading] = useState(false);
  const [routeMapCache, setRouteMapCache] = useState({});
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const load = async () => {
      setDashLoading(true);
      try {
        const now = new Date();
        const curMonth = now.toISOString().slice(0, 7);
        const od = `${curMonth}-01`;
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const doDate = `${curMonth}-${String(lastDay).padStart(2, '0')}`;

        const [statsRes, urnikRes, voznikiRes, tahRes] = await Promise.allSettled([
          api.get('/dashboard/statistics'),
          api.get('/admin/urnik'),
          api.get('/admin/vozniki'),
          api.get(`/admin/tahograf?od=${od}&do=${doDate}`),
        ]);
        if (statsRes.status === 'fulfilled')   setStatistics(statsRes.value.data);
        if (urnikRes.status === 'fulfilled')   setUrnikAll(urnikRes.value.data || []);
        if (voznikiRes.status === 'fulfilled') setTotalVozniki((voznikiRes.value.data || []).length);
        if (tahRes.status === 'fulfilled')     setDashTahData(tahRes.value.data || []);
      } catch {
      } finally {
        setDashLoading(false);
      }
    };
    load();
  }, []);

  const fmtEurDash = (v) => new Intl.NumberFormat('sl-SI', { style: 'currency', currency: 'EUR' }).format(v ?? 0);

  const recentPrevozi = useMemo(() => {
    const curMonth = new Date().toISOString().slice(0, 7);
    return [...urnikAll]
      .filter(u => new Date(u.datum).toISOString().slice(0, 7) === curMonth)
      .sort((a, b) => new Date(b.datum) - new Date(a.datum));
  }, [urnikAll]);

  const neplacaniAlerts = useMemo(() =>
    urnikAll
      .filter(u => !u.placano && u.cena != null && u.cena > 0)
      .sort((a, b) => new Date(b.datum) - new Date(a.datum)),
    [urnikAll]);

  const complianceAlerts = useMemo(() => {
    const map = {};
    dashTahData.filter(z => z.stanje === 'VOZNJA').forEach(z => {
      const k = z.fk_uporabnik;
      const name = z.uporabnik ? `${z.uporabnik.ime} ${z.uporabnik.priimek}` : `ID ${k}`;
      const day = new Date(z.zacetek).toISOString().slice(0, 10);
      if (!map[k]) map[k] = { name, days: {} };
      map[k].days[day] = (map[k].days[day] || 0) + (z.trajanje_min ?? 0);
    });
    const alerts = [];
    Object.values(map).forEach(({ name, days }) => {
      Object.entries(days).forEach(([date, mins]) => {
        if (mins > 9 * 60) {
          alerts.push({
            name,
            date: new Date(date).toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            ure: Math.round(mins / 60 * 10) / 10,
          });
        }
      });
    });
    return alerts.sort((a, b) => a.name.localeCompare(b.name));
  }, [dashTahData]);

  const todayPrevozi = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return [...urnikAll]
      .filter(u => new Date(u.datum).toISOString().slice(0, 10) === today)
      .sort((a, b) => new Date(a.datum) - new Date(b.datum));
  }, [urnikAll]);

  useEffect(() => {
    const fetch = async () => {
      setUreLoading(true);
      try {
        const [year, month] = selectedMonthUre.split('-').map(Number);
        const od = `${selectedMonthUre}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const doDate = `${selectedMonthUre}-${String(lastDay).padStart(2, '0')}`;
        const res = await api.get(`/admin/tahograf?od=${od}&do=${doDate}`);
        const skupaj = (res.data || [])
          .filter((z) => z.stanje === 'DELO' || z.stanje === 'VOZNJA')
          .reduce((sum, z) => sum + (z.trajanje_min ?? 0), 0);
        setSkupneUre(Math.round(skupaj / 60 * 10) / 10);
      } catch {
        setSkupneUre(null);
      } finally {
        setUreLoading(false);
      }
    };
    fetch();
  }, [selectedMonthUre]);

  useEffect(() => {
    const fetch = async () => {
      setVozilaLoading(true);
      try {
        const [year, month] = selectedMonthVozila.split('-').map(Number);
        const od = `${selectedMonthVozila}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const doDate = `${selectedMonthVozila}-${String(lastDay).padStart(2, '0')}`;
        setVozilaGrafDays(lastDay);

        const [tahRes, vozilaRes] = await Promise.all([
          api.get(`/admin/tahograf?od=${od}&do=${doDate}`),
          api.get('/vozila'),
        ]);

        const zapisi = tahRes.data || [];
        const vozila = vozilaRes.data || [];

        const lines = vozila
          .map((v) => {
            const dnevno = Array(lastDay).fill(0);
            zapisi
              .filter((z) => z.registrska === v.registerska && (z.stanje === 'DELO' || z.stanje === 'VOZNJA'))
              .forEach((z) => {
                const day = new Date(z.zacetek).getDate();
                if (day >= 1 && day <= lastDay) {
                  dnevno[day - 1] += (z.trajanje_min ?? 0) / 60;
                }
              });
            dnevno.forEach((_, i) => { dnevno[i] = Math.round(dnevno[i] * 10) / 10; });
            return { registerska: v.registerska, dnevno };
          })
          .filter((l) => l.dnevno.some((h) => h > 0));

        setVozilaLines(lines);
      } catch {
        setVozilaLines([]);
      } finally {
        setVozilaLoading(false);
      }
    };
    fetch();
  }, [selectedMonthVozila]);

  const displayRoutes = useMemo(() => {
    if (!selectedDate) return routes;
    return routes.filter((route) => route.date === selectedDate);
  }, [routes, selectedDate]);

  const fetchRoutes = useCallback(async () => {
    setRoutesLoading(true);
    setRoutesError(null);
    try {
      const response = await api.get('/admin/voznje');
      const mappedRoutes = (response.data || []).map((ride) => {
        const { from, to } = parseRelacija(ride.relacija);
        const dateValue = ride.datum || ride.zacetek;
        return {
          id: `RT-${ride.id_voznja}`,
          id_voznja: ride.id_voznja,
          date: new Date(dateValue).toISOString().slice(0, 10),
          driver: `${ride.uporabnik?.ime || ''} ${ride.uporabnik?.priimek || ''}`.trim() || 'Neznani voznik',
          vehicle: ride.registerska || '-',
          from,
          to,
          status: ride.konc && new Date(ride.konc).getTime() < Date.now() ? 'completed' : 'pending',
          durationLabel: formatDurationLabel(ride.zacetek, ride.konc),
          stranka: ride.stranka || '-',
          opis: ride.opis || ride.aktivnost || '-',
          zacetek: ride.zacetek,
          konc: ride.konc,
        };
      });
      setRoutes(mappedRoutes);
      setSelectedRouteId(null);
      setSelectedRouteMapData(null);
    } catch (err) {
      console.error('fetchRoutes error:', err);
      setRoutes([]);
      setRoutesError('Poti ni bilo mogoče naložiti iz baze.');
    } finally {
      setRoutesLoading(false);
    }
  }, []);

  const loadRouteMap = useCallback(async (from, to, route = null) => {
    const normalizedFrom = String(from || '').trim();
    const normalizedTo = String(to || '').trim();

    if (!normalizedFrom || !normalizedTo) {
      setSelectedRouteMapData(null);
      setRoutesError('Za prikaz zemljevida sta potrebni začetna in končna lokacija.');
      return;
    }

    const routeKey = `${normalizedFrom}__${normalizedTo}`;
    const routeInfo = route
      ? { ...route, from: normalizedFrom, to: normalizedTo }
      : { id: routeKey, from: normalizedFrom, to: normalizedTo, driver: 'Neznani voznik', vehicle: '-', status: 'pending' };

    setSelectedRouteId(routeInfo.id);

    if (routeMapCache[routeKey]) {
      setSelectedRouteMapData(routeMapCache[routeKey]);
      return;
    }

    setSelectedRouteLoading(true);
    try {
      const fromCoords = await geocodeLocation(normalizedFrom);
      await sleep(1100);
      const toCoords = await geocodeLocation(normalizedTo);

      if (!fromCoords || !toCoords) {
        const fallbackData = { ...routeInfo, fromCoords: null, toCoords: null, coordinates: null };
        setSelectedRouteMapData(fallbackData);
        setRouteMapCache((prev) => ({ ...prev, [routeKey]: fallbackData }));
        return;
      }

      const routeGeo = await fetchOsrmRoute(fromCoords, toCoords);
      const fullData = { ...routeInfo, fromCoords, toCoords, coordinates: routeGeo?.coordinates || null };
      setSelectedRouteMapData(fullData);
      setRouteMapCache((prev) => ({ ...prev, [routeKey]: fullData }));
    } catch (err) {
      console.error('loadRouteMap error:', err);
      setRoutesError('Napaka pri prikazu poti na zemljevidu.');
    } finally {
      setSelectedRouteLoading(false);
    }
  }, [routeMapCache]);

  useEffect(() => {
    if (activeTab === 'routes') fetchRoutes();
  }, [activeTab, fetchRoutes]);

  useEffect(() => {
    if (selectedRouteId && !displayRoutes.some((r) => r.id === selectedRouteId)) {
      setSelectedRouteId(null);
      setSelectedRouteMapData(null);
    }
  }, [displayRoutes, selectedRouteId]);

  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-72 flex-1 p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">

        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sirena Admin</h1>
              <p className="text-gray-500 text-sm mt-1">Nadzorna plošča – Pregled sistema</p>
            </div>
          </div>

          <div className="flex gap-4 border-b border-gray-200 overflow-x-auto">
            {[
              { key: 'dashboard', label: 'Nadzorna plošča' },
              { key: 'routes',    label: 'Prikaz poti'     },
              { key: 'analytics', label: 'Analitika'       },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 px-2 whitespace-nowrap text-sm sm:text-base font-semibold border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-8">
              <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Skupne ure — ta mesec</p>
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-blue-600 text-sm">schedule</span>
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {ureLoading ? '…' : skupneUre !== null ? skupneUre.toLocaleString('sl-SI') : '—'}
                </p>
                <p className="text-sm text-gray-500 mt-1">h (delo + vožnja)</p>
              </div>
              <StatCard label="Vozniki v bazi" value={totalVozniki.toLocaleString()} unit="voznikov" iconName="group" bgColor="bg-green-100" iconColor="text-green-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
              {/* ── Danes na sporedu ── */}
              <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Danes na sporedu</h2>
                {todayPrevozi.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
                    <span className="material-symbols-outlined text-3xl">event_available</span>
                    <p className="text-sm">Za danes ni načrtovanih prevozov.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todayPrevozi.map(u => (
                      <div key={u.id_urnik} className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                        <div className="flex-shrink-0 text-center w-12">
                          <p className="text-xs text-gray-400">ura</p>
                          <p className="text-sm font-bold text-gray-800">
                            {new Date(u.datum).toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{u.stranka?.naziv ?? '—'}</p>
                          <p className="text-xs text-gray-500 truncate">{u.naziv ?? ''}{u.vozilo ? ` · ${u.vozilo.registerska}` : ''}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs text-gray-600">{u.uporabnik ? `${u.uporabnik.ime} ${u.uporabnik.priimek}` : '—'}</p>
                          {u.cena != null && (
                            <p className="text-xs font-semibold text-gray-800">
                              {new Intl.NumberFormat('sl-SI', { style: 'currency', currency: 'EUR' }).format(u.cena)}
                            </p>
                          )}
                        </div>
                        <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          u.placano ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {u.placano ? 'Plačano' : 'Neplačano'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Opozorila ── */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Opozorila</h2>
                {complianceAlerts.length === 0 && neplacaniAlerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
                    <span className="material-symbols-outlined text-3xl">check_circle</span>
                    <p className="text-sm">Ni opozoril.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {complianceAlerts.map((a, i) => (
                      <div key={i} className="flex gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                        <span className="material-symbols-outlined text-red-600 text-[18px] shrink-0 mt-0.5">warning</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-red-900">Prekoračitev dnevne meje vožnje</p>
                          <p className="text-xs text-red-700 mt-0.5">{a.name} — {a.ure}h dne {a.date}</p>
                        </div>
                      </div>
                    ))}
                    {neplacaniAlerts.map(u => (
                      <div key={u.id_urnik} className="flex gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <span className="material-symbols-outlined text-amber-600 text-[18px] shrink-0 mt-0.5">payments</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-amber-900">Neplačani prevoz</p>
                          <p className="text-xs text-amber-800 mt-0.5">{u.stranka?.naziv ?? '—'} se mora plačati {fmtEurDash(u.cena)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-8 shadow-sm">
              <div className="mb-4">
                <h2 className="text-base sm:text-lg font-bold text-gray-900">Aktivnost vozil — ta mesec</h2>
                <p className="text-xs text-gray-500 mt-0.5">Dnevne ure dela in vožnje po vozilu (DELO + VOZNJA)</p>
              </div>

              <div className="w-full h-64 sm:h-72 bg-white rounded-lg border border-gray-100 p-2">
                <VozilaLineGraf lines={vozilaLines} days={vozilaGrafDays} />
              </div>

              {vozilaLines.length > 0 && (
                <div className="flex flex-wrap gap-4 mt-4">
                  {vozilaLines.map((l, i) => (
                    <div key={l.registerska} className="flex items-center gap-2 text-xs text-gray-600">
                      <div className="w-6 h-2 rounded-full" style={{ backgroundColor: LINE_COLORS[i % LINE_COLORS.length] }}></div>
                      <span>{l.registerska}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Zadnji prevozi ── */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-6 shadow-sm">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Prevozi ta mesec</h2>
              {recentPrevozi.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Ni prevozov ta mesec.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {['Datum', 'Stranka', 'Voznik', 'Vozilo', 'Relacija', 'Cena', 'Status'].map(h => (
                          <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recentPrevozi.map(u => (
                        <tr key={u.id_urnik} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                            {new Date(u.datum).toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </td>
                          <td className="px-3 py-3 font-medium text-gray-900 max-w-[140px] truncate">{u.stranka?.naziv ?? '—'}</td>
                          <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                            {u.uporabnik ? `${u.uporabnik.ime} ${u.uporabnik.priimek}` : '—'}
                          </td>
                          <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{u.vozilo?.registerska ?? '—'}</td>
                          <td className="px-3 py-3 text-gray-500 max-w-[160px] truncate">{u.naziv ?? '—'}</td>
                          <td className="px-3 py-3 font-semibold text-gray-800 whitespace-nowrap">
                            {u.cena != null ? new Intl.NumberFormat('sl-SI', { style: 'currency', currency: 'EUR' }).format(u.cena) : '—'}
                          </td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                              u.placano ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                            }`}>
                              <span className="material-symbols-outlined text-[12px]">{u.placano ? 'check_circle' : 'radio_button_unchecked'}</span>
                              {u.placano ? 'Plačano' : 'Neplačano'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </>
        )}

        {activeTab === 'routes' && (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Prikaz poti</h2>
              <p className="text-gray-500 text-sm">Seznam poti se naloži takoj, zemljevid pa šele ob kliku na relacijo.</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <label className="text-sm font-semibold text-gray-700">Izberi datum:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  onClick={fetchRoutes}
                  disabled={routesLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2 disabled:opacity-60"
                >
                  <span className={`material-symbols-outlined text-sm ${routesLoading ? 'animate-spin' : ''}`}>refresh</span>
                  {routesLoading ? 'Nalaganje...' : 'Osveži poti'}
                </button>
              </div>
            </div>

            {routesError && (
              <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                {routesError}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3 bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <div style={{ height: 500 }}>
                  <RoutesMap selectedRoute={selectedRouteMapData} loading={selectedRouteLoading} />
                </div>
              </div>
              <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4">Poti ({displayRoutes.length})</h3>
                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {displayRoutes.length === 0 && !routesLoading ? (
                    <div className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg p-4 text-center">
                      Ni poti za izbrani datum.
                    </div>
                  ) : (
                    displayRoutes.map((route, idx) => (
                      <RouteCard
                        key={route.id}
                        route={route}
                        color={ROUTE_COLORS[idx % ROUTE_COLORS.length]}
                        selected={route.id === selectedRouteId}
                        onClick={() => loadRouteMap(route.from, route.to, route)}
                      />
                    ))
                  )}
                </div>
                {selectedRouteId && (
                  <p className="mt-3 text-xs text-gray-500">
                    Izbrana pot: <span className="font-semibold text-gray-700">{selectedRouteId}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Opomba:</strong> Seznam poti se naloži takoj, zemljevid pa šele po kliku na posamezno pot. Geokodiranje poteka sekvencialno (1s zamik) skladno s pogoji uporabe Nominatim API.
              </p>
            </div>
          </>
        )}

        {activeTab === 'analytics' && <AnalyticsTab />}

      </main>
    </div>
  );
}