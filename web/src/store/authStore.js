import { create } from "zustand";

const useAuthStore = create((set) => ({
  token: localStorage.getItem("jwt_token"),
  vloga: localStorage.getItem("vloga") ? Number(localStorage.getItem("vloga")) : null,
  user: null,
  login: (token, vloga, user) => {
    localStorage.setItem("jwt_token", token);
    localStorage.setItem("vloga", vloga);
    set({ token, vloga, user });
  },
  logout: () => {
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("vloga");
    set({ token: null, vloga: null, user: null });
  },
}));

export default useAuthStore;
