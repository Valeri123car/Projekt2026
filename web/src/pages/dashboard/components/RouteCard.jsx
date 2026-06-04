import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const startIcon = L.icon({
  iconUrl:    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  iconSize:   [25, 41],
  iconAnchor: [12, 41],
});

const endIcon = L.icon({
  iconUrl:    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize:   [25, 41],
  iconAnchor: [12, 41],
});

const ROUTE_COLORS = ['#2563eb', '#f97316', '#8b5cf6', '#10b981', '#ef4444'];

function FitRouteBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points?.length > 1) {
      map.fitBounds(points, { padding: [30, 30] });
    }
  }, [map, points]);
  return null;
}

export function RouteCard({ route, color, selected, onClick }) {
  const bgStyle     = { backgroundColor: `${color}10`, borderColor: `${color}40` };
  const statusClass = route.status === 'completed'
    ? 'bg-green-100 text-green-700'
    : 'bg-yellow-100 text-yellow-700';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full p-3 rounded-lg border text-sm text-left transition-colors ${selected ? 'ring-2 ring-blue-500' : ''}`}
      style={bgStyle}
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
      <span className={`inline-block mt-3 px-2 py-1 rounded text-xs font-medium ${statusClass}`}>
        {route.status === 'completed' ? 'Končano' : 'Načrtovano'}
      </span>
    </button>
  );
}

export function RoutesMap({ selectedRoute, loading }) {
  const defaultCenter = [46.15, 14.99];
  const defaultZoom   = 8;

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
        <Popup>
          <strong>{selectedRoute.from}</strong><br />
          <small>Start — {selectedRoute.driver}</small>
        </Popup>
      </Marker>
      <Marker position={selectedRoute.toCoords} icon={endIcon}>
        <Popup>
          <strong>{selectedRoute.to}</strong><br />
          <small>Cilj — {selectedRoute.vehicle || '-'}</small>
        </Popup>
      </Marker>
    </MapContainer>
  );
}