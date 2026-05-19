import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import api from "../api/client";
import { useAuth } from "../hooks/useAuth";

export default function VoznjeScreen({ navigation }) {
  const [voznje, setVoznje] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { handleLogout } = useAuth();

  const naloziVoznje = async () => {
    try {
      const res = await api.get("/voznje");
      setVoznje(res.data);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    naloziVoznje();
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#0058be" />;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Moje vožnje</Text>
          <Text style={s.podnaslov}>{voznje.length} zapisov</Text>
        </View>
        <TouchableOpacity style={s.odjavaBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={18} color="#727785" />
          <Text style={s.odjava}>Odjava</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={voznje}
        keyExtractor={(item) => item.id_voznja.toString()}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              naloziVoznje();
            }}
            tintColor="#0058be"
          />
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardLevo}>
              <MaterialCommunityIcons
                name="truck-outline"
                size={22}
                color="#0058be"
              />
            </View>
            <View style={s.cardSredina}>
              <Text style={s.datum}>
                {new Date(item.datum).toLocaleDateString("sl-SI", {
                  weekday: "short",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </Text>
              <Text style={s.cas}>
                {new Date(item.zacetek).toLocaleTimeString("sl-SI", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {" — "}
                {new Date(item.konc).toLocaleTimeString("sl-SI", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color="#c2c6d6"
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={s.prazno}>
            <MaterialCommunityIcons
              name="truck-remove-outline"
              size={48}
              color="#c2c6d6"
            />
            <Text style={s.praznoTxt}>Ni voženj za prikaz.</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={s.fab}
        onPress={() =>
          Alert.alert("Kmalu", "Vnos vožnje pride v naslednji iteraciji.")
        }
      >
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9ff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e2ec",
  },
  title: { fontSize: 22, fontWeight: "800", color: "#191b23" },
  podnaslov: { fontSize: 12, color: "#727785", marginTop: 2 },
  odjavaBtn: { flexDirection: "row", alignItems: "center", gap: 4, padding: 8 },
  odjava: { color: "#727785", fontSize: 13 },
  card: {
    backgroundColor: "#fff",
    marginBottom: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e1e2ec",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardLevo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#e8f0fe",
    alignItems: "center",
    justifyContent: "center",
  },
  cardSredina: { flex: 1 },
  datum: { fontSize: 14, fontWeight: "700", color: "#191b23" },
  cas: { fontSize: 13, color: "#424754", marginTop: 2 },
  prazno: { alignItems: "center", paddingTop: 60, gap: 12 },
  praznoTxt: { color: "#727785", fontSize: 14 },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0058be",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0058be",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
