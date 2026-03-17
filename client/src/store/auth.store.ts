import { create } from "zustand";
import api, { setAccessToken } from "@/api/axios";
import type { User, LoginData, RegisterData, AuthResponse } from "@/types/auth";

// Zustand Store für die Authentifizierung
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (data) => {
    const response = await api.post<AuthResponse>("/auth/login", data);
    setAccessToken(response.data.accessToken);
    set({ user: response.data.user, isAuthenticated: true });
  },

  register: async (data) => {
    const response = await api.post<AuthResponse>("/auth/register", data);
    setAccessToken(response.data.accessToken);
    set({ user: response.data.user, isAuthenticated: true });
  },

  logout: async () => {
    await api.post("/auth/logout");
    setAccessToken(null);
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    try {
      const response = await api.post<AuthResponse>("/auth/refresh");
      setAccessToken(response.data.accessToken);
      set({ user: response.data.user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
