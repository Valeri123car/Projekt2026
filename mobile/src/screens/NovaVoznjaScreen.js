import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import api from "../api/client";
import { useGoogleCalendar } from "../hooks/useGoogleCalendar";

export default function NovaVoznjaScreen({ navigation }) {
  const [datum, setDatum] = useState(new Date());
  const [zacetek, setZacetek] = useState(new Date());
  const [konec, setKonec] = useState(new Date());
  const [stranka, setStranka] = useState("");
  const [postaje, setPostaje] = useState(["", ""]);
  const [opis, setOpis] = useState("");
  const [loading, setLoading] = useState(false);
  const [aktivniPicker, setAktivniPicker] = useState(null);

  const { dodajVoznjovVKolendar, jePovedzan } = useGoogleCalendar();

  const dodajPostajo = () => {
    if (postaje.length < 6) setPostaje([...postaje, ""]);
  };

  const odstraniPostajo = (index) => {
    if (postaje.length <= 2) return;
    setPostaje(postaje.filter((_, i) => i !== index));
  };

  const posodobiPostajo = (index, vrednost) => {
    const nove = [...postaje];
    nove[index] = vrednost;
    setPostaje(nove);
  };

  const relacijaString = () => postaje.filter((p) => p.trim()).join(" → ");

  const shrani = async () => {
    const relacija = relacijaString();
    if (!relacija) {
      Alert.alert("Napaka", "Vnesi vsaj začetek in konec relacije.");
      return;
    }

    const zacDatum = new Date(datum);
    zacDatum.setHours(zacetek.getHours(), zacetek.getMinutes(), 0, 0);

    const konDatum = new Date(datum);
    konDatum.setHours(konec.getHours(), konec.getMinutes(), 0, 0);

    if (konDatum <= zacDatum) {
      konDatum.setDate(konDatum.getDate() + 1);
    }

    setLoading(true);
    try {
      const res = await api.post("/voznje", {
        datum: datum.toISOString().split("T")[0],
        zacetek: zacDatum.toISOString(),
        konc: konDatum.toISOString(),
        stranka: stranka || null,
        relacija: relacija || null,
        opis: opis || null,
      });

      if (jePovedzan) {
        await dodajVoznjovVKolendar(res.data);
      }

      Alert.alert("Uspešno", "Vožnja je bila shranjena.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert("Napaka", "Vožnje ni bilo mogoče shraniti.");
    } finally {
      setLoading(false);
    }
  };

  const formatDatum = (d) =>
    d.toLocaleDateString("sl-SI", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  const formatCas = (d) =>
    d.toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" });

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.scroll}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.header}>
        <TouchableOpacity
          style={s.nazajBtn}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#0058be" />
          <Text style={s.nazajTxt}>Nazaj</Text>
        </TouchableOpacity>
        <Text style={s.naslov}>Nova vožnja</Text>
        <Text style={s.podnaslov}>Ročni vnos evidence</Text>
      </View>

      <View style={s.sekcija}>
        <Text style={s.sekcijaNaslov}>DATUM IN ČAS</Text>

        <Text style={s.label}>Datum</Text>
        <TouchableOpacity
          style={s.pickerBtn}
          onPress={() =>
            setAktivniPicker(aktivniPicker === "datum" ? null : "datum")
          }
        >
          <MaterialCommunityIcons name="calendar" size={18} color="#727785" />
          <Text style={s.pickerTxt}>{formatDatum(datum)}</Text>
          <MaterialCommunityIcons
            name={aktivniPicker === "datum" ? "chevron-up" : "chevron-down"}
            size={18}
            color="#c2c6d6"
          />
        </TouchableOpacity>
        {aktivniPicker === "datum" && (
          <>
            <DateTimePicker
              value={datum}
              mode="date"
              display="spinner"
              onChange={(e, d) => {
                if (d) setDatum(d);
              }}
            />
            <TouchableOpacity
              style={s.potrdiBtn}
              onPress={() => setAktivniPicker(null)}
            >
              <Text style={s.potrdiTxt}>Potrdi datum</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={s.casVrstica}>
          <View style={s.casPolje}>
            <Text style={s.label}>Začetek</Text>
            <TouchableOpacity
              style={s.pickerBtn}
              onPress={() =>
                setAktivniPicker(aktivniPicker === "zacetek" ? null : "zacetek")
              }
            >
              <MaterialCommunityIcons
                name="clock-start"
                size={18}
                color="#727785"
              />
              <Text style={s.pickerTxt}>{formatCas(zacetek)}</Text>
              <MaterialCommunityIcons
                name={
                  aktivniPicker === "zacetek" ? "chevron-up" : "chevron-down"
                }
                size={16}
                color="#c2c6d6"
              />
            </TouchableOpacity>
          </View>
          <View style={s.casPolje}>
            <Text style={s.label}>Konec</Text>
            <TouchableOpacity
              style={s.pickerBtn}
              onPress={() =>
                setAktivniPicker(aktivniPicker === "konec" ? null : "konec")
              }
            >
              <MaterialCommunityIcons
                name="clock-end"
                size={18}
                color="#727785"
              />
              <Text style={s.pickerTxt}>{formatCas(konec)}</Text>
              <MaterialCommunityIcons
                name={aktivniPicker === "konec" ? "chevron-up" : "chevron-down"}
                size={16}
                color="#c2c6d6"
              />
            </TouchableOpacity>
          </View>
        </View>

        {aktivniPicker === "zacetek" && (
          <>
            <DateTimePicker
              value={zacetek}
              mode="time"
              is24Hour
              display="spinner"
              onChange={(e, d) => {
                if (d) setZacetek(d);
              }}
              style={{ width: "100%" }}
            />
            <TouchableOpacity
              style={s.potrdiBtn}
              onPress={() => setAktivniPicker(null)}
            >
              <Text style={s.potrdiTxt}>Potrdi čas začetka</Text>
            </TouchableOpacity>
          </>
        )}

        {aktivniPicker === "konec" && (
          <>
            <DateTimePicker
              value={konec}
              mode="time"
              is24Hour
              display="spinner"
              onChange={(e, d) => {
                if (d) setKonec(d);
              }}
              style={{ width: "100%" }}
            />
            <TouchableOpacity
              style={s.potrdiBtn}
              onPress={() => setAktivniPicker(null)}
            >
              <Text style={s.potrdiTxt}>Potrdi čas konca</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={s.infoVrstica}>
          <MaterialCommunityIcons
            name="information-outline"
            size={14}
            color="#727785"
          />
          <Text style={s.infoTxt}>
            Če je konec naslednji dan, se datum samodejno prilagodi.
          </Text>
        </View>
      </View>

      <View style={s.sekcija}>
        <Text style={s.sekcijaNaslov}>PODROBNOSTI</Text>

        <Text style={s.label}>Stranka</Text>
        <View style={s.inputWrap}>
          <MaterialCommunityIcons
            name="domain"
            size={18}
            color="#727785"
            style={s.inputIkona}
          />
          <TextInput
            style={s.input}
            value={stranka}
            onChangeText={setStranka}
            placeholder="npr. Mercator d.d."
            placeholderTextColor="#c2c6d6"
          />
        </View>

        <Text style={s.label}>Relacija</Text>
        <Text style={s.labelOpis}>
          Dodaj postaje po vrsti — samodejno se povežejo z →
        </Text>
        {postaje.map((postaja, index) => (
          <View key={index} style={s.postajaVrstica}>
            <View style={s.postajaLevo}>
              <View
                style={[
                  s.postajaStevilka,
                  {
                    backgroundColor:
                      index === 0 || index === postaje.length - 1
                        ? "#0058be"
                        : "#e1e2ec",
                  },
                ]}
              >
                <Text
                  style={[
                    s.postajaStevilkaTxt,
                    {
                      color:
                        index === 0 || index === postaje.length - 1
                          ? "#fff"
                          : "#424754",
                    },
                  ]}
                >
                  {index === 0
                    ? "A"
                    : index === postaje.length - 1
                      ? "Z"
                      : String.fromCharCode(65 + index)}
                </Text>
              </View>
              {index < postaje.length - 1 && <View style={s.postajaLinija} />}
            </View>
            <View style={s.postajaInputWrap}>
              <TextInput
                style={s.postajaInput}
                value={postaja}
                onChangeText={(v) => posodobiPostajo(index, v)}
                placeholder={
                  index === 0
                    ? "Začetek (npr. Ljubljana)"
                    : index === postaje.length - 1
                      ? "Konec (npr. Maribor)"
                      : `Vmesna postaja ${index}`
                }
                placeholderTextColor="#c2c6d6"
              />
              {index > 0 && index < postaje.length - 1 && (
                <TouchableOpacity
                  onPress={() => odstraniPostajo(index)}
                  style={s.odstraniBtn}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={16}
                    color="#ba1a1a"
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        {postaje.length < 6 && (
          <TouchableOpacity style={s.dodajPostajoBtn} onPress={dodajPostajo}>
            <MaterialCommunityIcons name="plus" size={16} color="#0058be" />
            <Text style={s.dodajPostajoBtnTxt}>Dodaj vmesno postajo</Text>
          </TouchableOpacity>
        )}

        {relacijaString().length > 0 && (
          <View style={s.relacijaPreview}>
            <MaterialCommunityIcons
              name="map-marker-path"
              size={14}
              color="#0058be"
            />
            <Text style={s.relacijaPreviewTxt}>{relacijaString()}</Text>
          </View>
        )}

        <Text style={[s.label, { marginTop: 14 }]}>Opis</Text>
        <View style={[s.inputWrap, s.inputWrapMulti]}>
          <TextInput
            style={[s.input, s.inputMulti]}
            value={opis}
            onChangeText={setOpis}
            placeholder="Dodatne opombe..."
            placeholderTextColor="#c2c6d6"
            multiline
            numberOfLines={3}
          />
        </View>
      </View>

      {jePovedzan && (
        <View style={s.googleInfo}>
          <MaterialCommunityIcons name="google" size={14} color="#2e7d32" />
          <Text style={s.googleInfoTxt}>
            Vožnja bo dodana v Google Calendar
          </Text>
        </View>
      )}

      <TouchableOpacity style={s.shraniBtn} onPress={shrani} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <MaterialCommunityIcons name="check" size={20} color="#fff" />
            <Text style={s.shraniBtnTxt}>Shrani vožnjo</Text>
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
  podnaslov: { fontSize: 12, color: "#727785", marginTop: 2 },
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
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#424754",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  labelOpis: {
    fontSize: 11,
    color: "#727785",
    marginBottom: 10,
    marginTop: -4,
  },
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#c2c6d6",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#f9f9ff",
  },
  pickerTxt: { flex: 1, fontSize: 14, color: "#191b23", fontWeight: "500" },
  potrdiBtn: {
    backgroundColor: "#0058be",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  potrdiTxt: { color: "#fff", fontSize: 13, fontWeight: "700" },
  casVrstica: { flexDirection: "row", gap: 10 },
  casPolje: { flex: 1 },
  infoVrstica: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  infoTxt: { fontSize: 11, color: "#727785", flex: 1 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#c2c6d6",
    borderRadius: 10,
    marginBottom: 14,
    backgroundColor: "#f9f9ff",
  },
  inputWrapMulti: { alignItems: "flex-start", paddingTop: 4 },
  inputIkona: { paddingLeft: 12 },
  input: { flex: 1, padding: 12, fontSize: 14, color: "#191b23" },
  inputMulti: { minHeight: 80, textAlignVertical: "top" },
  postajaVrstica: { flexDirection: "row", marginBottom: 8 },
  postajaLevo: { width: 32, alignItems: "center" },
  postajaStevilka: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  postajaStevilkaTxt: { fontSize: 11, fontWeight: "800" },
  postajaLinija: {
    width: 2,
    flex: 1,
    backgroundColor: "#e1e2ec",
    marginVertical: 2,
  },
  postajaInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#c2c6d6",
    borderRadius: 10,
    backgroundColor: "#f9f9ff",
    paddingRight: 4,
  },
  postajaInput: { flex: 1, padding: 10, fontSize: 14, color: "#191b23" },
  odstraniBtn: { padding: 6 },
  dodajPostajoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#0058be",
    borderStyle: "dashed",
    marginBottom: 12,
    justifyContent: "center",
  },
  dodajPostajoBtnTxt: { color: "#0058be", fontSize: 13, fontWeight: "600" },
  relacijaPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#e8f0fe",
    padding: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  relacijaPreviewTxt: {
    color: "#0058be",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  googleInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f1f8f1",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2e7d32",
  },
  googleInfoTxt: { color: "#2e7d32", fontSize: 12, fontWeight: "600" },
  shraniBtn: {
    backgroundColor: "#0058be",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  shraniBtnTxt: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
