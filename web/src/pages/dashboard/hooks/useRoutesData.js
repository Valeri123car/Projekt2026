import { useState, useCallback } from "react";
import api from "../../../api/client";
import {
  parseRelacija,
  formatDurationLabel,
  geocodeLocation,
  fetchOsrmRoute,
  sleep,
} from "../utils/dashboardUtils";

export function useRoutesData() {
  const [routes, setRoutes] = useState([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [routesError, setRoutesError] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [selectedRouteMapData, setSelectedRouteMapData] = useState(null);
  const [selectedRouteLoading, setSelectedRouteLoading] = useState(false);
  const [routeMapCache, setRouteMapCache] = useState({});

  const fetchRoutes = useCallback(async () => {
    setRoutesLoading(true);
    setRoutesError(null);
    try {
      const response = await api.get("/admin/voznje");
      const mappedRoutes = (response.data || []).map((ride) => {
        const { from, to } = parseRelacija(ride.relacija);
        const dateValue = ride.datum || ride.zacetek;
        return {
          id: `RT-${ride.id_voznja}`,
          id_voznja: ride.id_voznja,
          date: new Date(dateValue).toISOString().slice(0, 10),
          driver:
            `${ride.uporabnik?.ime || ""} ${ride.uporabnik?.priimek || ""}`.trim() ||
            "Neznani voznik",
          vehicle: ride.registerska || "-",
          from,
          to,
          status:
            ride.konc && new Date(ride.konc).getTime() < Date.now()
              ? "completed"
              : "pending",
          durationLabel: formatDurationLabel(ride.zacetek, ride.konc),
          stranka: ride.stranka || "-",
          opis: ride.opis || ride.aktivnost || "-",
          zacetek: ride.zacetek,
          konc: ride.konc,
        };
      });
      setRoutes(mappedRoutes);
      setSelectedRouteId(null);
      setSelectedRouteMapData(null);
    } catch (err) {
      console.error("fetchRoutes error:", err);
      setRoutes([]);
      setRoutesError("Poti ni bilo mogoče naložiti iz baze.");
    } finally {
      setRoutesLoading(false);
    }
  }, []);

  const loadRouteMap = useCallback(
    async (from, to, route = null) => {
      const normalizedFrom = String(from || "").trim();
      const normalizedTo = String(to || "").trim();

      if (!normalizedFrom || !normalizedTo) {
        setSelectedRouteMapData(null);
        setRoutesError(
          "Za prikaz zemljevida sta potrebni začetna in končna lokacija.",
        );
        return;
      }

      const routeKey = `${normalizedFrom}__${normalizedTo}`;
      const routeInfo = route
        ? { ...route, from: normalizedFrom, to: normalizedTo }
        : {
            id: routeKey,
            from: normalizedFrom,
            to: normalizedTo,
            driver: "Neznani voznik",
            vehicle: "-",
            status: "pending",
          };

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
          const fallbackData = {
            ...routeInfo,
            fromCoords: null,
            toCoords: null,
            coordinates: null,
          };
          setSelectedRouteMapData(fallbackData);
          setRouteMapCache((prev) => ({ ...prev, [routeKey]: fallbackData }));
          return;
        }

        const routeGeo = await fetchOsrmRoute(fromCoords, toCoords);
        const fullData = {
          ...routeInfo,
          fromCoords,
          toCoords,
          coordinates: routeGeo?.coordinates || null,
        };
        setSelectedRouteMapData(fullData);
        setRouteMapCache((prev) => ({ ...prev, [routeKey]: fullData }));
      } catch (err) {
        console.error("loadRouteMap error:", err);
        setRoutesError("Napaka pri prikazu poti na zemljevidu.");
      } finally {
        setSelectedRouteLoading(false);
      }
    },
    [routeMapCache],
  );

  return {
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
  };
}
