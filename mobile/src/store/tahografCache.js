import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

const KLJUC_AKTIVNO = "tahograf_aktivno";
const KLJUC_CAKAJOCI = "tahograf_cakajoci";
const SIFRIRNI_KLJUC = "sirena_app_2026_tahograf_kljuc";

async function sifriraj(podatki) {
  const besedilo = JSON.stringify(podatki);
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    SIFRIRNI_KLJUC,
  );
  const kodirano = btoa(unescape(encodeURIComponent(besedilo)));
  return `${hash.slice(0, 8)}:${kodirano}`;
}

async function desifriraj(vrednost) {
  try {
    const [, kodirano] = vrednost.split(":");
    const besedilo = decodeURIComponent(escape(atob(kodirano)));
    return JSON.parse(besedilo);
  } catch {
    return null;
  }
}

export async function shraniAktivnoLokalno(zapis) {
  const sifrirano = await sifriraj(zapis);
  await AsyncStorage.setItem(KLJUC_AKTIVNO, sifrirano);
}

export async function preberiAktivnoLokalno() {
  const data = await AsyncStorage.getItem(KLJUC_AKTIVNO);
  if (!data) return null;
  return desifriraj(data);
}

export async function izbrisiAktivnoLokalno() {
  await AsyncStorage.removeItem(KLJUC_AKTIVNO);
}

export async function dodajCakajoci(akcija) {
  const obstojechi = await AsyncStorage.getItem(KLJUC_CAKAJOCI);
  const seznam = obstojechi ? await desifriraj(obstojechi) : [];
  seznam.push({ ...akcija, timestamp: new Date().toISOString() });
  const sifrirano = await sifriraj(seznam);
  await AsyncStorage.setItem(KLJUC_CAKAJOCI, sifrirano);
}

export async function preberiCakajoche() {
  const data = await AsyncStorage.getItem(KLJUC_CAKAJOCI);
  if (!data) return [];
  return (await desifriraj(data)) || [];
}

export async function izbrisiCakajoche() {
  await AsyncStorage.removeItem(KLJUC_CAKAJOCI);
}
