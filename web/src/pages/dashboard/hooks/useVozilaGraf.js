import { useState, useEffect, useCallback } from "react";
import api from "../../../api/client";
import { buildVoziloLine } from "../utils/dashboardUtils";

async function fetchVozilaData(selectedMonth) {
  const [year, month] = selectedMonth.split("-").map(Number);
  const od = `${selectedMonth}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const doDate = `${selectedMonth}-${String(lastDay).padStart(2, "0")}`;

  const [tahRes, vozilaRes] = await Promise.all([
    api.get(`/admin/tahograf?od=${od}&do=${doDate}`),
    api.get("/vozila"),
  ]);

  const zapisi = tahRes.data || [];
  const vozila = vozilaRes.data || [];

  return {
    lastDay,
    lines: vozila
      .map((v) => buildVoziloLine(v, zapisi, lastDay))
      .filter((l) => l.dnevno.some((h) => h > 0)),
  };
}

export function useVozilaGraf(selectedMonth) {
  const [vozilaLines, setVozilaLines] = useState([]);
  const [vozilaGrafDays, setVozilaGrafDays] = useState(30);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchVozilaData(selectedMonth)
      .then(({ lastDay, lines }) => {
        setVozilaGrafDays(lastDay);
        setVozilaLines(lines);
      })
      .catch(() => setVozilaLines([]))
      .finally(() => setLoading(false));
  }, [selectedMonth]);

  return { vozilaLines, vozilaGrafDays, loading };
}
