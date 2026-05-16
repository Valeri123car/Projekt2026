import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

const useAuthStore = create((set) => ({
  token: null,
  vloga: null,
  loadToken: async () => {
    const token = await SecureStore.getItemAsync("jwt_token");
    if (token) set({ token });
  },
  login: async (token, vloga) => {
    await SecureStore.setItemAsync("jwt_token", token);
    set({ token, vloga });
  },
  logout: async () => {
    await SecureStore.deleteItemAsync("jwt_token");
    set({ token: null, vloga: null });
  },
}));

export default useAuthStore;
