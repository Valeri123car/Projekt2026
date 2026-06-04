import axios from "axios";
import * as SecureStore from "expo-secure-store";

const api = axios.create({
  baseURL: "https://projekt2026.fly.dev/api/v1",
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("jwt_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const shouldRefresh =
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/auth/refresh") &&
      !originalRequest.url.includes("/auth/login");

    if (shouldRefresh) {
      originalRequest._retry = true;
      try {
        const res = await api.post("/auth/refresh");
        const noviToken = res.data.token;
        await SecureStore.setItemAsync("jwt_token", noviToken);
        originalRequest.headers.Authorization = `Bearer ${noviToken}`;
        return api(originalRequest);
      } catch {
        await SecureStore.deleteItemAsync("jwt_token");
        throw error;
      }
    }

    throw error;
  },
);

export default api;
