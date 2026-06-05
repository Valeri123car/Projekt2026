import { useState, useEffect, useMemo } from "react";
import api from "../../../api/client";

export function useDashboardData() {
  const [statistics, setStatistics] = useState({
    totalHours: 0,
    totalKm: 0,
    activeDrivers: 0,
    totalDrivers: 0,
  });
  const [voznjeAll, setVoznjeAll] = useState([]);
  const [totalVozniki, setTotalVozniki] = useState(0);
  const [dashTahData, setDashTahData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const curMonth = now.toISOString().slice(0, 7);
        const od = `${curMonth}-01`;
        const lastDay = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
        ).getDate();
        const doDate = `${curMonth}-${String(lastDay).padStart(2, "0")}`;

        const [statsRes, voznjeRes, voznikiRes, tahRes] =
          await Promise.allSettled([
            api.get("/dashboard/statistics"),
            api.get("/admin/voznje"),
            api.get("/admin/vozniki"),
            api.get(`/admin/tahograf?od=${od}&do=${doDate}`),
          ]);

        if (statsRes.status === "fulfilled") setStatistics(statsRes.value.data);
        if (voznjeRes.status === "fulfilled")
          setVoznjeAll(voznjeRes.value.data || []);
        if (voznikiRes.status === "fulfilled")
          setTotalVozniki((voznikiRes.value.data || []).length);
        if (tahRes.status === "fulfilled")
          setDashTahData(tahRes.value.data || []);
      } catch {
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const recentPrevozi = useMemo(() => {
    const curMonth = new Date().toISOString().slice(0, 7);
    return [...voznjeAll]
      .filter((u) => new Date(u.datum).toISOString().slice(0, 7) === curMonth)
      .sort((a, b) => new Date(b.datum) - new Date(a.datum));
  }, [voznjeAll]);

  const neplacaniAlerts = useMemo(
    () =>
      voznjeAll
        .filter((u) => !u.placano && u.cena != null && u.cena > 0)
        .sort((a, b) => new Date(b.datum) - new Date(a.datum)),
    [voznjeAll],
  );

  const complianceAlerts = useMemo(() => {
    const map = {};
    dashTahData
      .filter((z) => z.stanje === "VOZNJA")
      .forEach((z) => {
        const k = z.fk_uporabnik;
        const name = z.uporabnik
          ? `${z.uporabnik.ime} ${z.uporabnik.priimek}`
          : `ID ${k}`;
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
            date: new Date(date).toLocaleDateString("sl-SI", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }),
            ure: Math.round((mins / 60) * 10) / 10,
          });
        }
      });
    });
    return alerts.sort((a, b) => a.name.localeCompare(b.name));
  }, [dashTahData]);

  const todayPrevozi = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return [...voznjeAll]
      .filter((u) => new Date(u.datum).toISOString().slice(0, 10) === today)
      .sort((a, b) => new Date(a.datum) - new Date(b.datum));
  }, [voznjeAll]);

  return {
    statistics,
    voznjeAll,
    totalVozniki,
    dashTahData,
    loading,
    recentPrevozi,
    neplacaniAlerts,
    complianceAlerts,
    todayPrevozi,
  };
}
