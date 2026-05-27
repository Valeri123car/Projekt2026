import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
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

const geocodeLocation = async (locationName) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}, Slovenia&format=json&limit=1`
    );
    const data = await res.json();
    if (data.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch (err) {
    console.error(`Geocode error for "${locationName}":`, err);
  }
  return null;
};

const fetchOsrmRoute = async (fromCoords, toCoords) => {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/car/` +
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

// dummy podatki
const buildDummyRoutes = () => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split('T')[0];

  return [
    { id: 'RT-001', date: today,       driver: 'Marko Novak',    vehicle: 'LS-BUS-01',    from: 'Ljubljana', to: 'Maribor',        status: 'pending'   },
    { id: 'RT-002', date: today,       driver: 'Janez Potočnik', vehicle: 'MB-SIRENA-02', from: 'Ljubljana', to: 'Koper',          status: 'pending'   },
    { id: 'RT-003', date: yesterday,   driver: 'Luka Horvat',    vehicle: 'KP-SIRENA-03', from: 'Maribor',   to: 'Munchen',          status: 'completed' },
    { id: 'RT-004', date: twoDaysAgo,  driver: 'Marko Novak',    vehicle: 'LS-BUS-01',    from: 'Koper',     to: 'Ljubljana',      status: 'completed' },
    { id: 'RT-005', date: twoDaysAgo,  driver: 'Sara Kovačič',   vehicle: 'MR-BUS-02',    from: 'Ljubljana', to: 'Murska Sobota',  status: 'completed' },
  ];
};

const DUMMY_ROUTES = buildDummyRoutes();

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


function StatCard({ label, value, unit, extra, iconName, bgColor, iconColor, trend }) {
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
      {extra && <p className="text-xs text-gray-500 truncate">{extra}</p>}
    </div>
  );
}

function RouteCard({ route, color }) {
  return (
    <div className="p-3 rounded-lg border text-sm" style={{ backgroundColor: `${color}10`, borderColor: `${color}40` }}>
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
          <p className="text-xs text-gray-500">Km</p>
          <p className="font-bold text-gray-900">{route.distance ?? 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Ure</p>
          <p className="font-bold text-gray-900">{route.duration ?? 'N/A'}</p>
        </div>
      </div>
      <span className={`inline-block mt-3 px-2 py-1 rounded text-xs font-medium ${
        route.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
      }`}>
        {route.status === 'completed' ? 'Končano' : 'Načrtovano'}
      </span>
    </div>
  );
}

function RoutesMap({ geocodedRoutes, loading }) {
  const center = { center: [46.15, 14.99], zoom: 8 };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        <span className="material-symbols-outlined animate-spin mr-2">refresh</span>
        Nalaganje poti...
      </div>
    );
  }

  if (geocodedRoutes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        Ni poti za izbrani datum.
      </div>
    );
  }

  return (
    <MapContainer center={center.center} zoom={center.zoom} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      {geocodedRoutes.map((route, idx) => {
        const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
        return (
          <span key={route.id}>
            {route.coordinates && (
              <Polyline positions={route.coordinates} color={color} weight={3} opacity={0.8} />
            )}
            {route.fromCoords && (
              <Marker position={route.fromCoords} icon={startIcon}>
                <Popup><strong>{route.from}</strong><br /><small>Start — {route.driver}</small></Popup>
              </Marker>
            )}
            {route.toCoords && (
              <Marker position={route.toCoords} icon={endIcon}>
                <Popup><strong>{route.to}</strong><br /><small>Cilj — {route.vehicle}</small></Popup>
              </Marker>
            )}
          </span>
        );
      })}
    </MapContainer>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const today = new Date().toISOString().split('T')[0];

  const [statistics, setStatistics] = useState({
    totalHours: 1284,
    totalKm: 42850,
    totalRevenue: 158420,
    activeDrivers: 18,
    totalDrivers: 22,
  });
  const [rides, setRides] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [dashLoading, setDashLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(today);
  const [geocodedRoutes, setGeocodedRoutes] = useState([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // // TODO: dodati api endpointe za dinamicne prikaze
  useEffect(() => {
    const load = async () => {
      setDashLoading(true);
      try {
        const [statsRes, ridesRes, alertsRes] = await Promise.all([
          api.get('/admin/dashboard/statistics'),
          api.get('/admin/dashboard/recent-rides'),
          api.get('/admin/dashboard/alerts'),
        ]);
        setStatistics(statsRes.data);
        setRides(ridesRes.data);
        setAlerts(alertsRes.data);
      } catch {
        setRides(PLACEHOLDER_RIDES);
        setAlerts(PLACEHOLDER_ALERTS);
      } finally {
        setDashLoading(false);
      }
    };
    load();
  }, []);

  const loadRoutes = useCallback(async (date) => {
    setMapLoading(true);
    try {
      const filtered = DUMMY_ROUTES.filter(r => r.date === date);
      if (!filtered.length) { setGeocodedRoutes([]); return; }

      const processed = await Promise.all(
        filtered.map(async (route) => {
          const [fromCoords, toCoords] = await Promise.all([
            geocodeLocation(route.from),
            geocodeLocation(route.to),
          ]);
          if (!fromCoords || !toCoords) return null;
          const routeData = await fetchOsrmRoute(fromCoords, toCoords);
          return routeData ? { ...route, fromCoords, toCoords, ...routeData } : null;
        })
      );
      setGeocodedRoutes(processed.filter(Boolean));
    } catch (err) {
      console.error('loadRoutes error:', err);
    } finally {
      setMapLoading(false);
    }
  }, []);

  useEffect(() => { loadRoutes(selectedDate); }, [selectedDate, loadRoutes]);

  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-72 flex-1 p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sirena Admin</h1>
              <p className="text-gray-500 text-sm mt-1">Nadzorna plošča – Pregled sistema</p>
            </div>
            <div className="flex gap-2 sm:gap-4 items-center flex-wrap">
              <input
                type="text"
                placeholder="Iskanje voznikov..."
                className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-auto"
              />
              <button className="p-2 hover:bg-gray-200 rounded-lg hidden sm:block">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <button className="p-2 hover:bg-gray-200 rounded-lg hidden sm:block">
                <span className="material-symbols-outlined">help</span>
              </button>
            </div>
          </div>

          {/* Tabs */}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
              <StatCard label="Skupne ure"      value={statistics.totalHours.toLocaleString()} unit="h"  iconName="schedule"      bgColor="bg-blue-100"   iconColor="text-blue-600"   trend="↑ 12%" />
              <StatCard label="Skupni kilometri" value={statistics.totalKm.toLocaleString()}   unit="km" iconName="route"         bgColor="bg-orange-100" iconColor="text-orange-600" trend="↑ 5.6%" />
              <StatCard label="Skupni prihodi"   value={`€${(statistics.totalRevenue/1000).toFixed(0)}k`} extra={`€${statistics.totalRevenue.toLocaleString()}`} iconName="attach_money" bgColor="bg-red-100" iconColor="text-red-600" trend="↑ 1%" />
              <StatCard label="Aktivni vozniki"  value={`${statistics.activeDrivers}/${statistics.totalDrivers}`} unit="voznikov" iconName="group" bgColor="bg-green-100" iconColor="text-green-600" trend="Aktivno" />
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-8 shadow-sm">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-1">Aktivnost vozil</h2>
              <p className="text-xs sm:text-sm text-gray-500 mb-6">Prevoženi kilometri v zadnjih 24 urah</p>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6 pb-4 border-b border-gray-200">
                <div className="flex gap-2 flex-wrap">
                  {['Danes', 'Teden', 'Mesec', 'Po meri'].map((label, i) => (
                    <button key={label} className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg font-medium ${
                      i === 0 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}>{label}</button>
                  ))}
                </div>
                <div className="ml-auto flex gap-2">
                  {['grid_3x3', 'people'].map(icon => (
                    <button key={icon} className="px-3 py-1.5 bg-white text-gray-700 border border-gray-300 text-xs sm:text-sm rounded-lg font-medium hover:bg-gray-50 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">{icon}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-full h-64 sm:h-80 bg-white rounded-lg border border-gray-100 p-4 sm:p-6">
                <svg viewBox="0 0 800 300" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <pattern id="grid" width="100" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 100 0 L 0 0 0 30" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="800" height="300" fill="url(#grid)" />
                  {[['100',20],['75',95],['50',170],['25',245],['0',285]].map(([v,y]) => (
                    <text key={v} x="20" y={y} fontSize="12" fill="#6b7280">{v}</text>
                  ))}
                  <line x1="40" y1="20" x2="40"  y2="260" stroke="#374151" strokeWidth="2"/>
                  <line x1="40" y1="260" x2="800" y2="260" stroke="#374151" strokeWidth="2"/>
                  <polyline points="80,200 160,140 240,100 320,120 400,160 480,180 560,140 640,100 720,140 780,160" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="80,220 160,170 240,120 320,100 400,140 480,160 560,120 640,80 720,120 780,150"  fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="80,240 160,200 240,160 320,140 400,180 480,200 560,160 640,140 720,180 780,200" fill="none" stroke="#9ca3af" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5,5"/>
                  {[['06:00',70],['09:00',150],['12:00',230],['15:00',310],['18:00',390],['21:00',470],['00:00',550]].map(([t,x]) => (
                    <text key={t} x={x} y="285" fontSize="12" fill="#6b7280">{t}</text>
                  ))}
                </svg>
              </div>

              <div className="flex gap-4 sm:gap-6 mt-6 flex-wrap text-sm">
                {[['#2563eb','LS-BUS-01'],['#f97316','MR-BUS-02'],['#9ca3af','KP-BUS-03']].map(([color, label]) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: color }}></div>
                    <span className="text-gray-600 text-xs sm:text-sm">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
                <h2 className="text-base sm:text-lg font-bold text-gray-900">Detaljni pregled vozil</h2>
                <a href="#" className="text-blue-600 text-xs sm:text-sm font-semibold hover:underline">Izvozi poročilo (CSV)</a>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      {['Registracija','Voznik','Prevoženo','Ure vožnje','Poraba','Status','Akcije'].map((h, i) => (
                        <th key={h} className={`px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap ${
                          i === 1 ? 'hidden sm:table-cell' : i === 3 ? 'hidden md:table-cell' : i === 4 ? 'hidden lg:table-cell' : ''
                        }`}>{h.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rides.map(ride => (
                      <tr key={ride.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">{ride.id}</td>
                        <td className="px-3 sm:px-4 py-3 sm:py-4 hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
                              {ride.driver.charAt(0)}
                            </div>
                            <span className="text-gray-900 truncate text-xs sm:text-sm">{ride.driver}</span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-3 sm:py-4 text-gray-900 whitespace-nowrap">{ride.km} km</td>
                        <td className="px-3 sm:px-4 py-3 sm:py-4 text-gray-600 hidden md:table-cell whitespace-nowrap">{ride.hours}</td>
                        <td className="px-3 sm:px-4 py-3 sm:py-4 hidden lg:table-cell whitespace-nowrap">
                          <span className="text-orange-600 font-semibold">{ride.consumption}</span>
                        </td>
                        <td className="px-3 sm:px-4 py-3 sm:py-4">
                          <span className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                            ride.status === 'voznji' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            <span className="w-2 h-2 bg-current rounded-full"></span>
                            <span className="hidden sm:inline">{ride.status}</span>
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-3 sm:py-4">
                          <button className="p-1 hover:bg-gray-200 rounded">
                            <span className="material-symbols-outlined text-sm">more_vert</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Live map preview — clicking opens Routes tab */}
              <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900">Lokacije vozil – danes</h2>
                  <button
                    onClick={() => setActiveTab('routes')}
                    className="text-blue-600 text-xs font-semibold hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">open_in_full</span>
                    Odpri poti
                  </button>
                </div>
                <div className="h-64 sm:h-80 rounded-lg overflow-hidden border border-gray-200">
                  <RoutesMap geocodedRoutes={geocodedRoutes} loading={mapLoading} />
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-6">Zadnja opozorila</h2>
                <div className="space-y-3 sm:space-y-4">
                  {alerts.map(alert => (
                    <div key={alert.id} className={`p-3 sm:p-4 rounded-lg border ${
                      alert.type === 'warning' ? 'bg-red-50 border-red-200' :
                      alert.type === 'info'    ? 'bg-yellow-50 border-yellow-200' :
                                                 'bg-green-50 border-green-200'
                    }`}>
                      <div className="flex gap-2 sm:gap-3">
                        <span className={`material-symbols-outlined flex-shrink-0 text-sm sm:text-base ${
                          alert.type === 'warning' ? 'text-red-600' :
                          alert.type === 'info'    ? 'text-yellow-600' : 'text-green-600'
                        }`}>{alert.icon}</span>
                        <div>
                          <p className="font-semibold text-xs sm:text-sm text-gray-900">{alert.title}</p>
                          <p className="text-xs text-gray-600 mt-1">{alert.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-6 py-2 text-blue-600 text-xs sm:text-sm font-semibold hover:bg-blue-50 rounded-lg">
                  Preglej vsa opozorila
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'routes' && (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Prikaz poti</h2>
              <p className="text-gray-500 text-sm">Pregled vseh poti za izbrani datum</p>
            </div>

            {/* Date selector */}
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
                  onClick={() => loadRoutes(selectedDate)}
                  disabled={mapLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2 disabled:opacity-60"
                >
                  <span className={`material-symbols-outlined text-sm ${mapLoading ? 'animate-spin' : ''}`}>refresh</span>
                  Osveži
                </button>
              </div>
            </div>

            {geocodedRoutes.length === 0 && !mapLoading ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center shadow-sm text-gray-500">
                Ni poti za izbrani datum.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                  <div style={{ height: 500 }}>
                    <RoutesMap geocodedRoutes={geocodedRoutes} loading={mapLoading} />
                  </div>
                </div>
                <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-4">Poti ({geocodedRoutes.length})</h3>
                  <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                    {geocodedRoutes.map((route, idx) => (
                      <RouteCard key={route.id} route={route} color={ROUTE_COLORS[idx % ROUTE_COLORS.length]} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Test podatki:</strong> Razpoložljivi so podatki za danes, včeraj in pred dvema dnevoma.
              </p>
            </div>
          </>
        )}

        {activeTab === 'analytics' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center shadow-sm text-gray-400">
            <span className="material-symbols-outlined text-4xl mb-3 block">bar_chart</span>
            <p className="text-sm">Analitika – prihaja kmalu.</p>
          </div>
        )}

      </main>
    </div>
  );
}