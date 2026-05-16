import useAuthStore from "../store/authStore";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

export function useAuth() {
  const { token, vloga, login, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (email, geslo) => {
    const res = await api.post("/auth/login", { email, geslo });
    login(res.data.token, res.data.vloga);
    navigate("/");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return { token, vloga, handleLogin, handleLogout };
}
