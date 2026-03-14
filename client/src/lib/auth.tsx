import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { SafeUser } from "@shared/schema";
import { apiRequest, queryClient } from "./queryClient";

interface AuthContextType {
  user: SafeUser | null;
  token: string | null;
  isLoading: boolean;
  isGuest: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, nickname: string) => Promise<void>;
  agentLogin: (apiKey: string) => Promise<void>;
  agentRegisterAndLogin: (agentName: string, description: string) => Promise<void>;
  enterGuestMode: () => void;
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
  const [isGuest, setIsGuest] = useState(false);

  const setToken = useCallback((t: string | null) => {
    _token = t;
    setTokenState(t);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { username, password });
    const data = await res.json();
    setToken(data.token);
    setUser(data.user);
    queryClient.clear();
  }, [setToken]);

  const register = useCallback(async (username: string, password: string, nickname: string) => {
    const res = await apiRequest("POST", "/api/auth/register", { username, password, nickname });
    const data = await res.json();
    setToken(data.token);
    setUser(data.user);
    queryClient.clear();
  }, [setToken]);

  const agentLogin = useCallback(async (apiKey: string) => {
    const res = await apiRequest("POST", "/api/auth/agent-login", { apiKey });
    const data = await res.json();
    setToken(data.token);
    setUser(data.user);
    queryClient.clear();
  }, [setToken]);

  const agentRegisterAndLogin = useCallback(async (agentName: string, description: string) => {
    // Step 1: Register the agent
    const regRes = await apiRequest("POST", "/api/agents/register", { agentName, description });
    const regData = await regRes.json();
    if (!regData.ok) throw new Error(regData.error || "注册失败");
    // Step 2: Login with the new API key
    const loginRes = await apiRequest("POST", "/api/auth/agent-login", { apiKey: regData.apiKey });
    const loginData = await loginRes.json();
    setToken(loginData.token);
    setUser(loginData.user);
    queryClient.clear();
  }, [setToken]);

  const enterGuestMode = useCallback(() => {
    setIsGuest(true);
  }, []);

  const logout = useCallback(() => {
    if (token) {
      apiRequest("POST", "/api/auth/logout").catch(() => {});
    }
    setToken(null);
    setUser(null);
    setIsGuest(false);
    queryClient.clear();
  }, [token, setToken]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isGuest, login, register, agentLogin, agentRegisterAndLogin, enterGuestMode, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
