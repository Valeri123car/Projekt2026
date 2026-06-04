import { useState, useEffect } from "react";
import api from "../../../api/client";
import { buildVoziloLine } from "../utils/dashboardUtils";

export function useVozilaGraf(selectedMonth) {
  const [vozilaLines, setVozilaLines] = useState([]);
  const [vozilaGrafDays, setVozilaGrafDays] = useState(30);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // NOSONAR: S2004 - funkcije niso gnezdene globlje kot 2 nivoja, zato je fetch definirana tukaj
    const fetch = async () => {
      setLoading(true);
      try {
        const [year, month] = selectedMonth.split("-").map(Number);
        const od = `${selectedMonth}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const doDate = `${selectedMonth}-${String(lastDay).padStart(2, "0")}`;
        setVozilaGrafDays(lastDay);

        const [tahRes, vozilaRes] = await Promise.all([
          api.get(`/admin/tahograf?od=${od}&do=${doDate}`),
          api.get("/vozila"),
        ]);

        const zapisi = tahRes.data || [];
        const vozila = vozilaRes.data || [];

        const lines = vozila
          .map((v) => buildVoziloLine(v, zapisi, lastDay))
          .filter((l) => l.dnevno.some((h) => h > 0));

        setVozilaLines(lines);
      } catch {
        setVozilaLines([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [selectedMonth]);

  return { vozilaLines, vozilaGrafDays, loading };
}
