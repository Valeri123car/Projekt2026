import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import api from "../api/client";

const STANJA = {
  VOZNJA: { label: "Vožnja", barva: "#0058be", ikona: "truck", velikost: 22 },
  ODMOR: {
    label: "Odmor",
    barva: "#855300",
    ikona: "coffee-outline",
    velikost: 22,
  },
  POCITEK: { label: "Počitek", barva: "#2e7d32", ikona: "sleep", velikost: 22 },
  DRUGO: {
    label: "Drugo",
    barva: "#555555",
    ikona: "dots-horizontal",
    velikost: 22,
  },
};

const MAX_VOZNJA_MIN = 540;

function formatTimer(sekunde) {
  const h = Math.floor(sekunde / 3600);
  const m = Math.floor((sekunde % 3600) / 60);
  const s = sekunde % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatTrajanje(min) {
  if (!min && min !== 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  return `${h}h ${m}min`;
}

function formatTrajanjeNatancno(zapis) {
  if (!zapis.konec) return null;
  const diff = Math.floor(
    (new Date(zapis.konec) - new Date(zapis.zacetek)) / 1000,
  );
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  if (h > 0) return `${h}h ${m}min ${s}s`;
  if (m > 0) return `${m}min ${s}s`;
  return `${s}s`;
}

export default function TahografScreen() {
  const [aktivno, setAktivno] = useState(null);
  const [povzetek, setPovzetek] = useState(null);
  const [zgodovina, setZgodovina] = useState([]);
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menjiLoading, setMenjiLoading] = useState(false);

  const naloziPodatke = useCallback(async () => {
    try {
      const [akt, pov, zgod] = await Promise.all([
        api.get("/tahograf/aktivno"),
        api.get("/tahograf/povzetek"),
        api.get("/tahograf/zgodovina?limit=15"),
      ]);
      setAktivno(akt.data);
      setPovzetek(pov.data);
      setZgodovina(zgod.data);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    naloziPodatke();
  }, [naloziPodatke]);

  useEffect(() => {
    if (!aktivno?.zacetek) {
      setTimer(0);
      return;
    }
    const izracunaj = () => {
      const diff = Math.floor(
        (Date.now() - new Date(aktivno.zacetek).getTime()) / 1000,
      );
      setTimer(diff);
    };
    izracunaj();
    const interval = setInterval(izracunaj, 1000);
    return () => clearInterval(interval);
  }, [aktivno]);

  const zamenjajStanje = async (novoStanje) => {
    if (aktivno?.stanje === novoStanje) return;
    setMenjiLoading(true);
    try {
      await api.post("/tahograf/zacni", { stanje: novoStanje });
      await naloziPodatke();
    } catch {
      Alert.alert("Napaka", "Ni bilo mogoče zamenjati stanja.");
    } finally {
      setMenjiLoading(false);
    }
  };

  const zakljuci = async () => {
    Alert.alert("Zaključi dan", "Zaključiti aktivno stanje?", [
      { text: "Prekliči", style: "cancel" },
      {
        text: "Zaključi",
        style: "destructive",
        onPress: async () => {
          setMenjiLoading(true);
          try {
            await api.post("/tahograf/zakljuci");
            await naloziPodatke();
          } catch {
            Alert.alert("Napaka", "Ni bilo mogoče zaključiti.");
          } finally {
            setMenjiLoading(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#0058be" />
      </View>
    );
  }

  const aktivnoStanje = aktivno?.stanje;
  const aktivnaBarva = aktivnoStanje ? STANJA[aktivnoStanje]?.barva : "#727785";
  const vozbMinDanes = povzetek?.minute?.VOZNJA || 0;
  const vozbProgress = Math.min(vozbMinDanes / MAX_VOZNJA_MIN, 1);
  const vozbOpozorilo = vozbMinDanes >= 480;

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.scroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            naloziPodatke();
          }}
          tintColor="#0058be"
        />
      }
    >
      <View style={s.header}>
        <Text style={s.headerNaslov}>Tahograf</Text>
        <Text style={s.headerPodnaslov}>EU Uredba 561/2006</Text>
      </View>

      <View style={[s.aktivnaKartica, { borderColor: aktivnaBarva }]}>
        <View style={s.aktivnaVrstica}>
          <View
            style={[
              s.aktivnaIkonaWrap,
              { backgroundColor: aktivnaBarva + "18" },
            ]}
          >
            <MaterialCommunityIcons
              name={
                aktivnoStanje
                  ? STANJA[aktivnoStanje]?.ikona
                  : "pause-circle-outline"
              }
              size={28}
              color={aktivnaBarva}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.aktivnaOznaka}>TRENUTNO STANJE</Text>
            <Text style={[s.aktivnoStanje, { color: aktivnaBarva }]}>
              {aktivnoStanje
                ? STANJA[aktivnoStanje]?.label
                : "Ni aktivnega stanja"}
            </Text>
          </View>
          <Text style={[s.timer, { color: aktivnaBarva }]}>
            {aktivno ? formatTimer(timer) : "—"}
          </Text>
        </View>

        {aktivno && (
          <TouchableOpacity
            style={[s.zakljuciBtn, { borderColor: aktivnaBarva }]}
            onPress={zakljuci}
            disabled={menjiLoading}
          >
            <MaterialCommunityIcons
              name="stop-circle-outline"
              size={16}
              color={aktivnaBarva}
            />
            <Text style={[s.zakljuciBtnTxt, { color: aktivnaBarva }]}>
              Zaključi stanje
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={s.sekcijaNaslov}>ZAMENJAJ STANJE</Text>
      <View style={s.stanjaGrid}>
        {Object.entries(STANJA).map(([kljuc, info]) => {
          const jeAktiven = aktivnoStanje === kljuc;
          return (
            <TouchableOpacity
              key={kljuc}
              style={[
                s.stanjeBtn,
                {
                  borderColor: info.barva,
                  backgroundColor: jeAktiven ? info.barva : "#fff",
                },
              ]}
              onPress={() => zamenjajStanje(kljuc)}
              disabled={menjiLoading || jeAktiven}
            >
              <MaterialCommunityIcons
                name={info.ikona}
                size={info.velikost}
                color={jeAktiven ? "#fff" : info.barva}
              />
              <Text
                style={[
                  s.stanjeBtnTxt,
                  { color: jeAktiven ? "#fff" : info.barva },
                ]}
              >
                {info.label}
              </Text>
              {jeAktiven && <View style={s.aktivnaPika} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={s.sekcijaNaslov}>DANAŠNJI POVZETEK</Text>
      <View style={s.povzetekGrid}>
        {Object.entries(STANJA).map(([kljuc, info]) => (
          <View
            key={kljuc}
            style={[s.povzetekKartica, { borderLeftColor: info.barva }]}
          >
            <MaterialCommunityIcons
              name={info.ikona}
              size={18}
              color={info.barva}
            />
            <Text style={s.povzetekLabel}>{info.label}</Text>
            <Text style={[s.povzetekVrednost, { color: info.barva }]}>
              {formatTrajanje(povzetek?.minute?.[kljuc])}
            </Text>
          </View>
        ))}
      </View>

      <View style={[s.limitKartica, vozbOpozorilo && s.limitOpozorilo]}>
        <View style={s.limitVrstica}>
          <View style={s.limitLevo}>
            <MaterialCommunityIcons
              name="clock-alert-outline"
              size={16}
              color={vozbOpozorilo ? "#ba1a1a" : "#0058be"}
            />
            <Text style={s.limitNaslov}>Max vožnja danes</Text>
          </View>
          <Text
            style={[
              s.limitVrednost,
              { color: vozbOpozorilo ? "#ba1a1a" : "#0058be" },
            ]}
          >
            {formatTrajanje(vozbMinDanes)} / 9h
          </Text>
        </View>
        <View style={s.progressBar}>
          <View
            style={[
              s.progressFill,
              {
                width: `${vozbProgress * 100}%`,
                backgroundColor: vozbOpozorilo ? "#ba1a1a" : "#0058be",
              },
            ]}
          />
        </View>
        {vozbOpozorilo && (
          <View style={s.opozoriloVrstica}>
            <MaterialCommunityIcons name="alert" size={14} color="#ba1a1a" />
            <Text style={s.opozoriloBesedilo}>
              Bližate se dnevni meji vožnje
            </Text>
          </View>
        )}
      </View>

      <Text style={s.sekcijaNaslov}>ZADNJI ZAPISI</Text>
      {zgodovina.length === 0 ? (
        <View style={s.prazno}>
          <MaterialCommunityIcons
            name="clipboard-text-outline"
            size={40}
            color="#c2c6d6"
          />
          <Text style={s.praznoTxt}>Ni zapisov za danes.</Text>
        </View>
      ) : (
        zgodovina.map((zapis) => {
          const info = STANJA[zapis.stanje] || STANJA.DRUGO;
          const cas = new Date(zapis.zacetek).toLocaleTimeString("sl-SI", {
            hour: "2-digit",
            minute: "2-digit",
          });
          const datum = new Date(zapis.zacetek).toLocaleDateString("sl-SI", {
            day: "2-digit",
            month: "2-digit",
          });
          const trajanje = zapis.konec
            ? formatTrajanjeNatancno(zapis)
            : formatTimer(
                Math.floor(
                  (Date.now() - new Date(zapis.zacetek).getTime()) / 1000,
                ),
              );

          return (
            <View
              key={zapis.id_zapis}
              style={[s.zapisVrstica, { borderLeftColor: info.barva }]}
            >
              <View
                style={[
                  s.zapisIkonaWrap,
                  { backgroundColor: info.barva + "18" },
                ]}
              >
                <MaterialCommunityIcons
                  name={info.ikona}
                  size={18}
                  color={info.barva}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.zapisStanje, { color: info.barva }]}>
                  {info.label}
                </Text>
                <Text style={s.zapisCas}>
                  {datum} ob {cas}
                </Text>
              </View>
              <View style={s.zapisDesno}>
                <Text style={s.zapisTrajanje}>{trajanje}</Text>
                {!zapis.konec && (
                  <View
                    style={[s.aktivnaPikaMala, { backgroundColor: info.barva }]}
                  />
                )}
              </View>
            </View>
          );
        })
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9ff" },
  scroll: { padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: { paddingTop: 52, paddingBottom: 16 },
  headerNaslov: { fontSize: 28, fontWeight: "800", color: "#191b23" },
  headerPodnaslov: { fontSize: 12, color: "#727785", marginTop: 2 },

  aktivnaKartica: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 2,
    padding: 16,
    marginBottom: 20,
  },
  aktivnaVrstica: { flexDirection: "row", alignItems: "center", gap: 12 },
  aktivnaIkonaWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  aktivnaOznaka: {
    fontSize: 10,
    color: "#727785",
    fontWeight: "700",
    letterSpacing: 1,
  },
  aktivnoStanje: { fontSize: 20, fontWeight: "700", marginTop: 2 },
  timer: { fontSize: 24, fontWeight: "800", fontVariant: ["tabular-nums"] },
  zakljuciBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  zakljuciBtnTxt: { fontSize: 13, fontWeight: "600" },

  sekcijaNaslov: {
    fontSize: 11,
    fontWeight: "700",
    color: "#727785",
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 4,
  },

  stanjaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  stanjeBtn: {
    width: "47%",
    borderWidth: 2,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    position: "relative",
  },
  stanjeBtnTxt: { fontSize: 14, fontWeight: "700" },
  aktivnaPika: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
    position: "absolute",
    top: 8,
    right: 8,
  },

  povzetekGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  povzetekKartica: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: "#c2c6d6",
    gap: 4,
  },
  povzetekLabel: { fontSize: 11, color: "#727785", fontWeight: "600" },
  povzetekVrednost: { fontSize: 18, fontWeight: "700", marginTop: 2 },

  limitKartica: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#c2c6d6",
  },
  limitOpozorilo: { borderColor: "#ba1a1a", backgroundColor: "#fff5f5" },
  limitVrstica: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  limitLevo: { flexDirection: "row", alignItems: "center", gap: 6 },
  limitNaslov: { fontSize: 13, fontWeight: "600", color: "#191b23" },
  limitVrednost: { fontSize: 13, fontWeight: "700" },
  progressBar: {
    height: 8,
    backgroundColor: "#e1e2ec",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 4 },
  opozoriloVrstica: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  opozoriloBesedilo: { fontSize: 12, color: "#ba1a1a", fontWeight: "600" },

  prazno: { alignItems: "center", padding: 24, gap: 8 },
  praznoTxt: { color: "#727785", fontSize: 14 },

  zapisVrstica: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: "#c2c6d6",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  zapisIkonaWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  zapisStanje: { fontSize: 14, fontWeight: "700" },
  zapisCas: { fontSize: 12, color: "#727785", marginTop: 2 },
  zapisDesno: { alignItems: "flex-end", gap: 4 },
  zapisTrajanje: { fontSize: 13, fontWeight: "600", color: "#424754" },
  aktivnaPikaMala: { width: 7, height: 7, borderRadius: 4 },
});
