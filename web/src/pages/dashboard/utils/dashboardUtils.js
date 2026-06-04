export const ROUTE_COLORS = [
  "#2563eb",
  "#f97316",
  "#8b5cf6",
  "#10b981",
  "#ef4444",
];
export const LINE_COLORS = [
  "#2563eb",
  "#f97316",
  "#10b981",
  "#8b5cf6",
  "#ef4444",
  "#f59e0b",
  "#06b6d4",
  "#ec4899",
];

export const STANJE_COLORS = {
  VOZNJA: "#1d4ed8",
  DELO: "#6b21a8",
  POCITEK: "#166534",
  ODMOR: "#92400e",
  RAZPOLOZLJIVOST: "#c2410c",
  DRUGO: "#6b7280",
  NEZNANO: "#9ca3af",
};

export const STANJE_LABELS = {
  VOZNJA: "Vožnja",
  DELO: "Delo",
  POCITEK: "Počitek",
  ODMOR: "Odmor",
  RAZPOLOZLJIVOST: "Razpoložljivost",
  DRUGO: "Drugo",
  NEZNANO: "Neznano",
};

export const TEDEN = ["Pon", "Tor", "Sre", "Čet", "Pet", "Sob", "Ned"];

export const fmtH = (h) => `${h.toFixed(1)}h`;
export const fmtEur = (v) =>
  new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" }).format(
    v ?? 0,
  );

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const geocodeCache = new Map();
const UNKNOWN_VALUES = new Set(["neznano", "unknown", "-", ""]);

export const formatDurationLabel = (start, end) => {
  if (!start || !end) return "-";
  const diffMinutes = Math.floor((new Date(end) - new Date(start)) / 60000);
  if (!Number.isFinite(diffMinutes) || diffMinutes <= 0) return "-";
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}min`;
};

export const parseRelacija = (relacija) => {
  if (!relacija || typeof relacija !== "string") {
    return { from: "Neznano", to: "Neznano" };
  }
  const separators = [" -> ", "->", " → ", "→"];
  for (const sep of separators) {
    const idx = relacija.indexOf(sep);
    if (idx !== -1) {
      const from = relacija.slice(0, idx).trim();
      const to = relacija.slice(idx + sep.length).trim();
      return { from: from || "Neznano", to: to || "Neznano" };
    }
  }
  const value = relacija.trim();
  return { from: value || "Neznano", to: "Neznano" };
};

const performGeocodeFetch = async (normalized) => {
  const url = `/nominatim/search?format=jsonv2&limit=1&addressdetails=1&countrycodes=si&q=${encodeURIComponent(normalized + ", Slovenia")}`;
  const res = await fetch(url);

  if (res.status === 429) {
    console.warn(
      `Nominatim rate limit hit for "${normalized}" — retry after 2s`,
    );
    await sleep(2000);
    const retry = await fetch(url);
    if (!retry.ok) return null;
    const retryData = await retry.json();
    return retryData.length > 0
      ? [parseFloat(retryData[0].lat), parseFloat(retryData[0].lon)]
      : null;
  }

  if (!res.ok) {
    console.warn(`Geocode failed for "${normalized}" — status ${res.status}`);
    return null;
  }

  const data = await res.json();
  return data.length > 0
    ? [parseFloat(data[0].lat), parseFloat(data[0].lon)]
    : null;
};

export const geocodeLocation = async (locationName) => {
  const normalized = String(locationName || "").trim();
  if (!normalized || UNKNOWN_VALUES.has(normalized.toLowerCase())) return null;
  if (normalized.includes("→") || normalized.includes("->")) return null;
  if (geocodeCache.has(normalized)) return geocodeCache.get(normalized);

  try {
    const result = await performGeocodeFetch(normalized);
    geocodeCache.set(normalized, result);
    return result;
  } catch (err) {
    console.error(`Geocode error for "${locationName}":`, err);
    geocodeCache.set(normalized, null);
    return null;
  }
};

export const fetchOsrmRoute = async (fromCoords, toCoords) => {
  try {
    const res = await fetch(
      `/osrm/route/v1/car/` +
        `${fromCoords[1]},${fromCoords[0]};${toCoords[1]},${toCoords[0]}` +
        `?overview=full&geometries=geojson`,
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
    console.error("OSRM error:", err);
  }
  return null;
};

export const buildVoziloLine = (vozilo, zapisi, lastDay) => {
  const dnevno = Array(lastDay).fill(0);
  zapisi
    .filter(
      (z) =>
        z.registrska === vozilo.registerska &&
        (z.stanje === "DELO" || z.stanje === "VOZNJA"),
    )
    .forEach((z) => {
      const day = new Date(z.zacetek).getDate();
      if (day >= 1 && day <= lastDay) {
        dnevno[day - 1] += (z.trajanje_min ?? 0) / 60;
      }
    });
  return {
    registerska: vozilo.registerska,
    dnevno: dnevno.map((h) => Math.round(h * 10) / 10),
  };
};
