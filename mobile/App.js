import { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "./src/screens/LoginScreen";
import VoznjeScreen from "./src/screens/VoznjeScreen";
import useAuthStore from "./src/store/authStore";

const Stack = createNativeStackNavigator();

export default function App() {
  const { token, loadToken } = useAuthStore();

  useEffect(() => {
    loadToken();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token == null ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="Voznje" component={VoznjeScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
