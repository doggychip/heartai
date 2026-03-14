import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { SafeUser } from "@shared/schema";
import { apiRequest, queryClient } from "./queryClient";

interface AuthContextType {
  user: SafeUser | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, nickname: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Token stored in module scope (React state syncs it to context)
// CANNOT use localStorage — blocked in sandboxed iframe
let _token: string | null = null;

export function getAuthToken(): string | null {
  return _token;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const setToken = useCallback((t: string | null) => {
    _token = t;
    setTokenState(t);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { username, password });
    const data = await res.json();
    setToken(data.token);
    setUser(data.user);
    // Clear all cached queries so they refetch with the new user
    queryClient.clear();
  }, [setToken]);

  const register = useCallback(async (username: string, password: string, nickname: string) => {
    const res = await apiRequest("POST", "/api/auth/register", { username, password, nickname });
    const data = await res.json();
    setToken(data.token);
    setUser(data.user);
    queryClient.clear();
  }, [setToken]);

  const logout = useCallback(() => {
    if (token) {
      // Fire and forget
      apiRequest("POST", "/api/auth/logout").catch(() => {});
    }
    setToken(null);
    setUser(null);
    queryClient.clear();
  }, [token, setToken]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
