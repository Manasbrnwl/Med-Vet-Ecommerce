import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { secureStorage } from "../lib/storage";
import type { AuthUser } from "../api/types";

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  setUser: (user: AuthUser) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hydrated: false,
      setAuth: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      clearAuth: () => set({ token: null, user: null }),
    }),
    {
      name: "vma-auth",
      storage: createJSONStorage(() => secureStorage),
      partialize: (s) => ({ token: s.token, user: s.user }),
      onRehydrateStorage: () => () => useAuthStore.setState({ hydrated: true }),
    }
  )
);

export const isLoggedIn = () => !!useAuthStore.getState().token;
