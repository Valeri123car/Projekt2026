import { useState, useEffect, useMemo } from 'react';
import { RouteCard, RoutesMap } from './components/RouteCard';
import { useRoutesData } from './hooks/useRoutesData';
import { ROUTE_COLORS } from './utils/dashboardUtils';

export default function RoutesTab() {
  const [selectedDate, setSelectedDate] = useState('');

  const {
    routes,
    routesLoading,
    routesError,
    selectedRouteId,
    selectedRouteMapData,
    selectedRouteLoading,
    fetchRoutes,
    loadRouteMap,
    setSelectedRouteId,
    setSelectedRouteMapData,
  } = useRoutesData();

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  const displayRoutes = useMemo(() => {
    if (!selectedDate) return routes;
    return routes.filter((route) => route.date === selectedDate);
  }, [routes, selectedDate]);

  useEffect(() => {
    if (selectedRouteId && !displayRoutes.some((r) => r.id === selectedRouteId)) {
      setSelectedRouteId(null);
      setSelectedRouteMapData(null);
    }
  }, [displayRoutes, selectedRouteId, setSelectedRouteId, setSelectedRouteMapData]);

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Prikaz poti</h2>
        <p className="text-gray-500 text-sm">Seznam poti se naloži takoj, zemljevid pa šele ob kliku na relacijo.</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <label htmlFor="routes-date" className="text-sm font-semibold text-gray-700">Izberi datum:</label>
          <input
            id="routes-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
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
  );
}