import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
      await handleLogin(email, geslo);
      navigation.replace("Main");
    } catch {
      setNapaka("Napačen email ali geslo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <View style={s.logoWrap}>
        <MaterialCommunityIcons name="truck" size={40} color="#0058be" />
      </View>
      <Text style={s.title}>Sirena d.o.o.</Text>
      <Text style={s.subtitle}>Logistični portal</Text>
      <View style={s.card}>
        <Text style={s.label}>E-pošta</Text>
        <View style={s.inputWrap}>
          <MaterialCommunityIcons
            name="email-outline"
            size={18}
            color="#727785"
            style={s.inputIkona}
          />
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="vas@podjetje.si"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#c2c6d6"
          />
        </View>
        <Text style={s.label}>Geslo</Text>
        <View style={s.inputWrap}>
          <MaterialCommunityIcons
            name="lock-outline"
            size={18}
            color="#727785"
            style={s.inputIkona}
          />
          <TextInput
            style={s.input}
            value={geslo}
            onChangeText={setGeslo}
            placeholder="••••••••"
            secureTextEntry
            placeholderTextColor="#c2c6d6"
          />
        </View>
        {napaka ? (
          <View style={s.napakWrap}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={14}
              color="#ba1a1a"
            />
            <Text style={s.napaka}>{napaka}</Text>
          </View>
        ) : null}
        <TouchableOpacity
          style={s.button}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.buttonText}>Prijava</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9ff",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#e8f0fe",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: "800", color: "#191b23", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#727785", marginBottom: 32 },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#c2c6d6",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#424754",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#c2c6d6",
    borderRadius: 10,
    marginBottom: 16,
    backgroundColor: "#f9f9ff",
  },
  inputIkona: { paddingLeft: 12 },
  input: { flex: 1, padding: 12, fontSize: 14, color: "#191b23" },
  napakWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  napaka: { color: "#ba1a1a", fontSize: 13 },
  button: {
    backgroundColor: "#0058be",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
