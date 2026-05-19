import AsyncStorage from "@react-native-async-storage/async-storage";

const KLJUC_AKTIVNO = "tahograf_aktivno";
const KLJUC_CAKAJOCI = "tahograf_cakajoci";

export async function shraniAktivnoLokalno(zapis) {
  await AsyncStorage.setItem(KLJUC_AKTIVNO, JSON.stringify(zapis));
}

export async function preberiAktivnoLokalno() {
  const data = await AsyncStorage.getItem(KLJUC_AKTIVNO);
  return data ? JSON.parse(data) : null;
}

export async function izbrisiAktivnoLokalno() {
  await AsyncStorage.removeItem(KLJUC_AKTIVNO);
}

export async function dodajCakajoci(akcija) {
  const obstojechi = await AsyncStorage.getItem(KLJUC_CAKAJOCI);
  const seznam = obstojechi ? JSON.parse(obstojechi) : [];
  seznam.push({ ...akcija, timestamp: new Date().toISOString() });
  await AsyncStorage.setItem(KLJUC_CAKAJOCI, JSON.stringify(seznam));
}

export async function preberiCakajoche() {
  const data = await AsyncStorage.getItem(KLJUC_CAKAJOCI);
  return data ? JSON.parse(data) : [];
}

export async function izbrisiCakajoche() {
  await AsyncStorage.removeItem(KLJUC_CAKAJOCI);
}
