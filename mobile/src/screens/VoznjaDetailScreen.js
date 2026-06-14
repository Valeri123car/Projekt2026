import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import api from "../api/client";

function resolveStranka(stranka) {
  if (!stranka) return "—";
  if (typeof stranka === "string") return stranka;
  if (typeof stranka === "object") return stranka.naziv || "—";
  return "—";
}

function resolveRelacija(relacija) {
  if (!relacija) return "—";
  return String(relacija);
}

function resolveOpis(opis) {
  if (!opis) return "—";
  return String(opis);
}

export default function VoznjaDetailScreen({ route, navigation }) {
  const { voznja } = route.params;
  const [loading, setLoading] = useState(false);

  const izbrisi = () => {
    Alert.alert("Izbriši vožnjo", "Ste prepričani?", [
      { text: "Prekliči", style: "cancel" },
      {
        text: "Izbriši",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            await api.delete(`/voznje/${voznja.id_voznja}`);
            navigation.goBack();
          } catch {
            Alert.alert("Napaka", "Vožnje ni bilo mogoče izbrisati.");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const datum = new Date(voznja.datum).toLocaleDateString("sl-SI", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const zacetek = new Date(voznja.zacetek).toLocaleTimeString("sl-SI", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const konec = new Date(voznja.konc).toLocaleTimeString("sl-SI", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const trajMin = Math.round(
    (new Date(voznja.konc) - new Date(voznja.zacetek)) / 60000,
  );
  const trajH = Math.floor(trajMin / 60);
  const trajM = trajMin % 60;
  const trajanje = trajH > 0 ? `${trajH}h ${trajM}min` : `${trajM}min`;

  const strankaIme = resolveStranka(voznja.stranka ?? voznja.stranka_ime);
  const relacija = resolveRelacija(voznja.relacija);
  const opis = resolveOpis(voznja.opis);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll}>
      <View style={s.header}>
        <TouchableOpacity
          style={s.nazajBtn}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#0058be" />
          <Text style={s.nazajTxt}>Nazaj</Text>
        </TouchableOpacity>
        <Text style={s.naslov}>Podrobnosti vožnje</Text>
        <Text style={s.podnaslov}>{datum}</Text>
      </View>

      <View style={s.heroKartica}>
        <View style={s.heroIkonaWrap}>
          <MaterialCommunityIcons name="truck" size={32} color="#0058be" />
        </View>
        <View style={s.heroVrstica}>
          <View style={s.heroPolje}>
            <Text style={s.heroOznaka}>ZAČETEK</Text>
            <Text style={s.heroVrednost}>{zacetek}</Text>
          </View>
          <MaterialCommunityIcons
            name="arrow-right"
            size={20}
            color="#c2c6d6"
          />
          <View style={s.heroPolje}>
            <Text style={s.heroOznaka}>KONEC</Text>
            <Text style={s.heroVrednost}>{konec}</Text>
          </View>
          <View style={[s.heroPolje, s.heroPoljeDesno]}>
            <Text style={s.heroOznaka}>TRAJANJE</Text>
            <Text style={[s.heroVrednost, { color: "#0058be" }]}>
              {trajanje}
            </Text>
          </View>
        </View>
      </View>

      <View style={s.sekcija}>
        <Text style={s.sekcijaNaslov}>PODROBNOSTI</Text>

        <View style={s.vrstica}>
          <View style={s.vrsticaIkonaWrap}>
            <MaterialCommunityIcons name="domain" size={18} color="#0058be" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.vrsticaOznaka}>Stranka</Text>
            <Text style={s.vrsticaVrednost}>{strankaIme}</Text>
          </View>
        </View>

        <View style={s.locilo} />

        <View style={s.vrstica}>
          <View style={s.vrsticaIkonaWrap}>
            <MaterialCommunityIcons
              name="map-marker-path"
              size={18}
              color="#0058be"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.vrsticaOznaka}>Relacija</Text>
            <Text style={s.vrsticaVrednost}>{relacija}</Text>
          </View>
        </View>

        <View style={s.locilo} />

        <View style={s.vrstica}>
          <View style={s.vrsticaIkonaWrap}>
            <MaterialCommunityIcons
              name="text-box-outline"
              size={18}
              color="#0058be"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.vrsticaOznaka}>Opis</Text>
            <Text style={s.vrsticaVrednost}>{opis}</Text>
          </View>
        </View>

        <View style={s.locilo} />

        <View style={s.vrstica}>
          <View style={s.vrsticaIkonaWrap}>
            <MaterialCommunityIcons
              name="identifier"
              size={18}
              color="#0058be"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.vrsticaOznaka}>ID vožnje</Text>
            <Text style={s.vrsticaVrednost}>#{voznja.id_voznja}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={s.izbrisiBtn}
        onPress={izbrisi}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ba1a1a" />
        ) : (
          <>
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={18}
              color="#ba1a1a"
            />
            <Text style={s.izbrisiTxt}>Izbriši vožnjo</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9ff" },
  scroll: { padding: 16 },
  header: { paddingTop: 52, paddingBottom: 20 },
  nazajBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },
  nazajTxt: { color: "#0058be", fontSize: 14, fontWeight: "600" },
  naslov: { fontSize: 28, fontWeight: "800", color: "#191b23" },
  podnaslov: {
    fontSize: 13,
    color: "#727785",
    marginTop: 4,
    textTransform: "capitalize",
  },
  heroKartica: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e1e2ec",
  },
  heroIkonaWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#e8f0fe",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  heroVrstica: { flexDirection: "row", alignItems: "center", gap: 8 },
  heroPolje: { flex: 1 },
  heroPoljeDesno: { alignItems: "flex-end" },
  heroOznaka: {
    fontSize: 9,
    fontWeight: "700",
    color: "#727785",
    letterSpacing: 1,
  },
  heroVrednost: {
    fontSize: 20,
    fontWeight: "800",
    color: "#191b23",
    marginTop: 2,
  },
  sekcija: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e1e2ec",
  },
  sekcijaNaslov: {
    fontSize: 11,
    fontWeight: "700",
    color: "#727785",
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  vrstica: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  vrsticaIkonaWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#e8f0fe",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  vrsticaOznaka: { fontSize: 11, color: "#727785", fontWeight: "600" },
  vrsticaVrednost: {
    fontSize: 15,
    fontWeight: "600",
    color: "#191b23",
    marginTop: 2,
  },
  locilo: { height: 1, backgroundColor: "#f2f3fd", marginVertical: 12 },
  izbrisiBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ba1a1a",
    backgroundColor: "#fff5f5",
    marginTop: 8,
  },
  izbrisiTxt: { color: "#ba1a1a", fontSize: 15, fontWeight: "700" },
});
