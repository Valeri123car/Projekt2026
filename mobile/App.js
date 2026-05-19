import { useEffect } from "react";
import { Alert } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Device from "expo-device";
import LoginScreen from "./src/screens/LoginScreen";
import VoznjeScreen from "./src/screens/VoznjeScreen";
import NovaVoznjaScreen from "./src/screens/NovaVoznjaScreen";
import TahografScreen from "./src/screens/TahografScreen";
import VoznjaDetailScreen from "./src/screens/VoznjaDetailScreen";
import useAuthStore from "./src/store/authStore";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const VozStack = createNativeStackNavigator();

function VoznjeStack() {
  return (
    <VozStack.Navigator screenOptions={{ headerShown: false }}>
      <VozStack.Screen name="VoznjeList" component={VoznjeScreen} />
      <VozStack.Screen name="NovaVoznja" component={NovaVoznjaScreen} />
      <VozStack.Screen name="VoznjaDetail" component={VoznjaDetailScreen} />
    </VozStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#e1e2ec",
          height: 64,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarActiveTintColor: "#0058be",
        tabBarInactiveTintColor: "#727785",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tab.Screen
        name="Voznje"
        component={VoznjeStack}
        options={{
          tabBarLabel: "Vožnje",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="truck-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Tahograf"
        component={TahografScreen}
        options={{
          tabBarLabel: "Tahograf",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="clock-time-four-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const { token, loadToken } = useAuthStore();

  useEffect(() => {
    loadToken();
    preveriNapravo();
  }, []);

  const preveriNapravo = async () => {
    if (!Device.isDevice) return;
    if (Device.osInternalBuildId?.includes("test-keys")) {
      Alert.alert(
        "Varnostno opozorilo",
        "Naprava je rootana. Aplikacija morda ne bo delovala varno.",
        [{ text: "Razumem" }],
      );
    }
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token == null ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
