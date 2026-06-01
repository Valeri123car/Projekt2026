import { useEffect, useRef, useCallback } from "react";
import NetInfo from "@react-native-community/netinfo";
import api from "../api/client";
import { preberiCakajoche, izbrisiCakajoche } from "../store/tahografCache";

export function useSinhronizacija(onSinhronizacija) {
  const sinhronizira = useRef(false);

  const sinhroniziraj = useCallback(async () => {
    if (sinhronizira.current) return;

    const cakajoci = await preberiCakajoche();
    if (cakajoci.length === 0) return;

    sinhronizira.current = true;
    try {
      for (const akcija of cakajoci) {
        if (akcija.tip === "zacni") {
          await api.post("/tahograf/zacni", {
            stanje: akcija.stanje,
            cas_akcije: akcija.cas,
            registrska: akcija.registrska || undefined,
          });
        } else if (akcija.tip === "zakljuci") {
          await api.post("/tahograf/zakljuci", {
            cas_akcije: akcija.cas,
          });
        }
      }
      await izbrisiCakajoche();
      if (onSinhronizacija) onSinhronizacija();
    } catch {
    } finally {
      sinhronizira.current = false;
    }
  }, [onSinhronizacija]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (state.isConnected) {
        await sinhroniziraj();
      }
    });
    return () => unsubscribe();
  }, [sinhroniziraj]);
}
