import useAuthStore from "../store/authStore";
import api from "../api/client";

export function useAuth() {
  const { token, vloga, login, logout } = useAuthStore();

  const handleLogin = async (email, geslo) => {
    const res = await api.post("/auth/login", { email, geslo });
    await login(res.data.token, res.data.vloga);
    return res.data.vloga;
  };

  const handleLogout = async () => {
    await logout();
  };

  return { token, vloga, handleLogin, handleLogout };
}
