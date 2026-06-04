import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import api from "../api/client";
import { useGoogleCalendar } from "../hooks/useGoogleCalendar";

LocaleConfig.locales["sl"] = {
  monthNames: [
    "Januar",
    "Februar",
    "Marec",
    "April",
    "Maj",
    "Junij",
    "Julij",
    "Avgust",
    "September",
    "Oktober",
    "November",
    "December",
  ],
  monthNamesShort: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Maj",
    "Jun",
    "Jul",
    "Avg",
    "Sep",
    "Okt",
    "Nov",
    "Dec",
  ],
  dayNames: [
    "Nedelja",
    "Ponedeljek",
    "Torek",
    "Sreda",
    "Četrtek",
    "Petek",
    "Sobota",
  ],
  dayNamesShort: ["Ned", "Pon", "Tor", "Sre", "Čet", "Pet", "Sob"],
  today: "Danes",
};
LocaleConfig.defaultLocale = "sl";

const BARVE_STANJ = {
  VOZNJA: "#0058be",
  ODMOR: "#855300",
  POCITEK: "#2e7d32",
  DELO: "#6a1b9a",
  RAZPOLOZLJIVOST: "#e65100",
  DRUGO: "#555555",
};

const IKONE_STANJ = {
  VOZNJA: "truck",
  ODMOR: "coffee-outline",
  POCITEK: "sleep",
  DELO: "briefcase-outline",
  RAZPOLOZLJIVOST: "clock-outline",
  DRUGO: "dots-horizontal",
};

const LABELE_STANJ = {
  VOZNJA: "Vožnja",
  ODMOR: "Odmor",
  POCITEK: "Počitek",
  DELO: "Delo",
  RAZPOLOZLJIVOST: "Razpoložljivost",
  DRUGO: "Drugo",
};

function formatCas(iso) {
  return new Date(iso).toLocaleTimeString("sl-SI", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTrajanje(min) {
  if (!min && min !== 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h === 0 ? `${m}min` : `${h}h ${m}min`;
}

function mesecniObseg(m) {
  const od = `${m}-01`;
  const zadnjiDan = new Date(m.split("-")[0], m.split("-")[1], 0).getDate();
  const do_ = `${m}-${String(zadnjiDan).padStart(2, "0")}`;
  return { od, do_ };
}

function dodajTahografDot(oznaceni, dan, stanje) {
  if (!oznaceni[dan]) oznaceni[dan] = { marked: true, dots: [] };
  const barva = BARVE_STANJ[stanje] || "#555";
  if (!oznaceni[dan].dots.find((d) => d.color === barva)) {
    oznaceni[dan].dots.push({ color: barva, key: stanje });
  }
}

function dodajVoznjaRocnoDot(oznaceni, dan) {
  if (!oznaceni[dan]) oznaceni[dan] = { marked: true, dots: [] };
  if (!oznaceni[dan].dots.find((d) => d.key === "ROCNO")) {
    oznaceni[dan].dots.push({ color: "#2e7d32", key: "ROCNO" });
  }
}

function pretвориVoznjoVZapis(v) {
  return {
    id_zapis: `voznja_${v.id_voznja}`,
    stanje: "VOZNJA",
    zacetek: v.zacetek,
    konec: v.konc,
    trajanje_min: Math.round((new Date(v.konc) - new Date(v.zacetek)) / 60000),
    registrska: v.relacija || null,
    vir: "ROCNO",
    stranka: v.stranka,
    opis: v.opis,
  };
}

export default function UrnikScreen() {
  const [izbraniDatum, setIzbraniDatum] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [zapisi, setZapisi] = useState([]);
  const [oznaceniDatumi, setOznaceniDatumi] = useState({});
  const [loading, setLoading] = useState(true);
  const [mesec, setMesec] = useState(
    new Date().toISOString().split("T")[0].slice(0, 7),
  );

  const {
    jePovedzan,
    povezi,
    odklopi,
    loading: googleLoading,
  } = useGoogleCalendar();

  const naloziMesec = useCallback(async (m) => {
    try {
      const { od, do_ } = mesecniObseg(m);
      const [tahRes, vozRes] = await Promise.all([
        api.get(`/tahograf/zgodovina?od=${od}&do=${do_}&limit=500`),
        api.get("/voznje"),
      ]);

      const oznaceni = {};

      for (const z of tahRes.data) {
        const dan = new Date(z.zacetek).toISOString().split("T")[0];
        dodajTahografDot(oznaceni, dan, z.stanje);
      }

      for (const v of vozRes.data) {
        const dan = new Date(v.datum).toISOString().split("T")[0];
        if (dan >= od && dan <= do_) {
          dodajVoznjaRocnoDot(oznaceni, dan);
        }
      }

      setOznaceniDatumi(oznaceni);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  const naloziDan = useCallback(async (datum) => {
    try {
      const [tahRes, vozRes] = await Promise.all([
        api.get(`/tahograf/zgodovina?od=${datum}&do=${datum}&limit=100`),
        api.get("/voznje"),
      ]);

      const voznjeTaDan = vozRes.data
        .filter((v) => new Date(v.datum).toISOString().split("T")[0] === datum)
        .map(pretвориVoznjoVZapis);

      const vsi = [...tahRes.data, ...voznjeTaDan].sort(
        (a, b) => new Date(a.zacetek) - new Date(b.zacetek),
      );

      setZapisi(vsi);
    } catch {
      setZapisi([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      naloziMesec(mesec);
      naloziDan(izbraniDatum);
    }, []),
  );

  const onDanIzbran = (dan) => {
    setIzbraniDatum(dan.dateString);
    naloziDan(dan.dateString);
  };

  const onMesecSpremenjen = (m) => {
    const noviMesec = `${m.year}-${String(m.month).padStart(2, "0")}`;
    setMesec(noviMesec);
    naloziMesec(noviMesec);
  };

  const izbraniDatumFormatiran = new Date(
    izbraniDatum + "T00:00:00",
  ).toLocaleDateString("sl-SI", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const skupajVoznjaMin = zapisi
    .filter((z) => z.stanje === "VOZNJA" && z.trajanje_min)
    .reduce((a, z) => a + z.trajanje_min, 0);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerNaslov}>Urnik</Text>
        <Text style={s.headerPodnaslov}>Pregled voženj po dnevih</Text>
      </View>

      <View style={s.googleSync}>
        <MaterialCommunityIcons
          name="google"
          size={18}
          color={jePovedzan ? "#2e7d32" : "#727785"}
        />
        <Text
          style={[s.googleTxt, { color: jePovedzan ? "#2e7d32" : "#727785" }]}
        >
          {jePovedzan
            ? "Google Calendar povezan"
            : "Google Calendar ni povezan"}
        </Text>
        <TouchableOpacity
          style={[
            s.googleBtn,
            { backgroundColor: jePovedzan ? "#fdecea" : "#e8f0fe" },
          ]}
          onPress={jePovedzan ? odklopi : povezi}
          disabled={googleLoading}
        >
          <Text
            style={[
              s.googleBtnTxt,
              { color: jePovedzan ? "#ba1a1a" : "#0058be" },
            ]}
          >
            {googleLoading ? "..." : jePovedzan ? "Odklopi" : "Poveži"}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#0058be" style={{ marginTop: 40 }} />
      ) : (
        <Calendar
          current={izbraniDatum}
          onDayPress={onDanIzbran}
          onMonthChange={onMesecSpremenjen}
          markingType="multi-dot"
          markedDates={{
            ...oznaceniDatumi,
            [izbraniDatum]: {
              ...(oznaceniDatumi[izbraniDatum] || {}),
              selected: true,
              selectedColor: "#0058be",
            },
          }}
          theme={{
            backgroundColor: "#f9f9ff",
            calendarBackground: "#ffffff",
            textSectionTitleColor: "#727785",
            selectedDayBackgroundColor: "#0058be",
            selectedDayTextColor: "#ffffff",
            todayTextColor: "#0058be",
            dayTextColor: "#191b23",
            textDisabledColor: "#c2c6d6",
            arrowColor: "#0058be",
            monthTextColor: "#191b23",
            textDayFontWeight: "500",
            textMonthFontWeight: "700",
            textDayHeaderFontWeight: "600",
          }}
          style={s.koledar}
        />
      )}

      <View style={s.danHeader}>
        <Text style={s.danNaslov} numberOfLines={1}>
          {izbraniDatumFormatiran}
        </Text>
        {skupajVoznjaMin > 0 && (
          <View style={s.skupajPil}>
            <MaterialCommunityIcons name="truck" size={12} color="#0058be" />
            <Text style={s.skupajTxt}>{formatTrajanje(skupajVoznjaMin)}</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={s.seznam}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {zapisi.length === 0 ? (
          <View style={s.prazno}>
            <MaterialCommunityIcons
              name="calendar-blank-outline"
              size={40}
              color="#c2c6d6"
            />
            <Text style={s.praznoTxt}>Ni zapisov za ta dan.</Text>
          </View>
        ) : (
          zapisi.map((zapis) => {
            const barva =
              zapis.vir === "ROCNO"
                ? "#2e7d32"
                : BARVE_STANJ[zapis.stanje] || "#555";
            const ikona = IKONE_STANJ[zapis.stanje] || "dots-horizontal";
            const label = LABELE_STANJ[zapis.stanje] || zapis.stanje;

            return (
              <View
                key={String(zapis.id_zapis)}
                style={[s.zapisVrstica, { borderLeftColor: barva }]}
              >
                <View
                  style={[s.zapisIkonaWrap, { backgroundColor: barva + "18" }]}
                >
                  <MaterialCommunityIcons
                    name={ikona}
                    size={18}
                    color={barva}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.zapisGlava}>
                    <Text style={[s.zapisStanje, { color: barva }]}>
                      {label}
                    </Text>
                    {zapis.vir === "ROCNO" && (
                      <View
                        style={[s.virPil, { backgroundColor: "#2e7d3218" }]}
                      >
                        <Text style={[s.virTxt, { color: "#2e7d32" }]}>
                          ročno
                        </Text>
                      </View>
                    )}
                    {zapis.vir === "UVOZENO" && (
                      <View style={s.virPil}>
                        <Text style={s.virTxt}>uvoženo</Text>
                      </View>
                    )}
                    {zapis.vir === "DDD" && (
                      <View
                        style={[s.virPil, { backgroundColor: "#6a1b9a18" }]}
                      >
                        <Text style={[s.virTxt, { color: "#6a1b9a" }]}>
                          DDD
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.zapisCas}>
                    {formatCas(zapis.zacetek)} —{" "}
                    {zapis.konec ? formatCas(zapis.konec) : "..."}
                  </Text>
                  {zapis.stranka && (
                    <Text style={s.zapisReg}>{zapis.stranka}</Text>
                  )}
                  {zapis.registrska && !zapis.stranka && (
                    <Text style={s.zapisReg}>{zapis.registrska}</Text>
                  )}
                  {zapis.opis && <Text style={s.zapisOpis}>{zapis.opis}</Text>}
                </View>
                <Text style={s.zapisTrajanje}>
                  {formatTrajanje(zapis.trajanje_min)}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9ff" },
  header: { paddingTop: 52, paddingHorizontal: 16, paddingBottom: 8 },
  headerNaslov: { fontSize: 28, fontWeight: "800", color: "#191b23" },
  headerPodnaslov: { fontSize: 12, color: "#727785", marginTop: 2 },
  googleSync: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    marginHorizontal: 8,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e1e2ec",
  },
  googleTxt: { flex: 1, fontSize: 13, fontWeight: "600" },
  googleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  googleBtnTxt: { fontSize: 12, fontWeight: "700" },
  koledar: { marginHorizontal: 8, borderRadius: 12 },
  danHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e2ec",
  },
  danNaslov: {
    fontSize: 13,
    fontWeight: "700",
    color: "#191b23",
    flex: 1,
    textTransform: "capitalize",
  },
  skupajPil: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e8f0fe",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  skupajTxt: { fontSize: 11, fontWeight: "700", color: "#0058be" },
  seznam: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  prazno: { alignItems: "center", paddingTop: 40, gap: 8 },
  praznoTxt: { color: "#727785", fontSize: 14 },
  zapisVrstica: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: "#e1e2ec",
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
  zapisGlava: { flexDirection: "row", alignItems: "center", gap: 6 },
  zapisStanje: { fontSize: 14, fontWeight: "700" },
  virPil: {
    backgroundColor: "#e8f0fe",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  virTxt: { fontSize: 9, fontWeight: "700", color: "#0058be" },
  zapisCas: { fontSize: 12, color: "#727785", marginTop: 2 },
  zapisReg: { fontSize: 11, color: "#424754", marginTop: 1, fontWeight: "600" },
  zapisOpis: { fontSize: 11, color: "#727785", marginTop: 1 },
  zapisTrajanje: { fontSize: 13, fontWeight: "600", color: "#424754" },
});
