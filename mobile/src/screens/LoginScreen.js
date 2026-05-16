import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../hooks/useAuth";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [geslo, setGeslo] = useState("");
  const [napaka, setNapaka] = useState("");
  const [loading, setLoading] = useState(false);
  const { handleLogin } = useAuth();

  const handleSubmit = async () => {
    setLoading(true);
    setNapaka("");
    try {
      const vloga = await handleLogin(email, geslo);
      if (vloga === 1) navigation.replace("Voznje");
      else navigation.replace("Dashboard");
    } catch {
      setNapaka("Napačen email ali geslo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sirena d.o.o.</Text>
      <Text style={styles.subtitle}>Logistični portal</Text>
      <View style={styles.card}>
        <Text style={styles.label}>E-pošta</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="vas@podjetje.si"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Text style={styles.label}>Geslo</Text>
        <TextInput
          style={styles.input}
          value={geslo}
          onChangeText={setGeslo}
          placeholder="••••••••"
          secureTextEntry
        />
        {napaka ? <Text style={styles.error}>{napaka}</Text> : null}
        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Prijava</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9ff",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#0058be",
    marginBottom: 4,
  },
  subtitle: { fontSize: 14, color: "#424754", marginBottom: 32 },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#c2c6d6",
  },
  label: { fontSize: 12, fontWeight: "600", color: "#424754", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#c2c6d6",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  error: { color: "#ba1a1a", fontSize: 13, marginBottom: 12 },
  button: {
    backgroundColor: "#0058be",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
