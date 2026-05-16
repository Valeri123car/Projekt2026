import { create } from "zustand";

const useAuthStore = create((set) => ({
  token: localStorage.getItem("jwt_token"),
  vloga: null,
  user: null,
  login: (token, vloga, user) => {
    localStorage.setItem("jwt_token", token);
    set({ token, vloga, user });
  },
  logout: () => {
    localStorage.removeItem("jwt_token");
    set({ token: null, vloga: null, user: null });
  },
}));

export default useAuthStore;
