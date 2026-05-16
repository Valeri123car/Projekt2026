import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import api from "../api/client";
import { useAuth } from "../hooks/useAuth";

export default function VoznjeScreen({ navigation }) {
  const [voznje, setVoznje] = useState([]);
  const [loading, setLoading] = useState(true);
  const { handleLogout } = useAuth();

  useEffect(() => {
    api
      .get("/voznje")
      .then((res) => {
        setVoznje(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Moje vožnje</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>Odjava</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={voznje}
        keyExtractor={(item) => item.id_voznja.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.datum}>
              {new Date(item.datum).toLocaleDateString("sl-SI")}
            </Text>
            <Text style={styles.info}>
              {new Date(item.zacetek).toLocaleTimeString("sl-SI")} –{" "}
              {new Date(item.konc).toLocaleTimeString("sl-SI")}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Ni voženj.</Text>}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("NovaVoznja")}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9ff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    paddingTop: 60,
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#191b23" },
  logout: { color: "#0058be", fontSize: 14 },
  card: {
    backgroundColor: "#fff",
    margin: 8,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#c2c6d6",
  },
  datum: { fontSize: 16, fontWeight: "600", color: "#191b23" },
  info: { fontSize: 13, color: "#424754", marginTop: 4 },
  empty: { textAlign: "center", marginTop: 40, color: "#424754" },
  fab: {
    position: "absolute",
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0058be",
    alignItems: "center",
    justifyContent: "center",
  },
  fabText: { color: "#fff", fontSize: 28, fontWeight: "bold" },
});
