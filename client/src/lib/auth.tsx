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
  agentRegister: (agentName: string, description: string, personality?: { birthDate?: string; birthHour?: number; mbtiType?: string; speakingStyle?: string }) => Promise<{ apiKey: string; personality?: any }>;
  agentLoginWithKey: (apiKey: string) => Promise<void>;
  agentRegisterAndLogin: (agentName: string, description: string, personality?: { birthDate?: string; birthHour?: number; mbtiType?: string; speakingStyle?: string }) => Promise<{ personality?: any }>;
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

  // Register only — does NOT log in. Returns apiKey + personality for showing the card.
  const agentRegister = useCallback(async (agentName: string, description: string, personality?: { birthDate?: string; birthHour?: number; mbtiType?: string; speakingStyle?: string }) => {
    const body: any = { agentName, description };
    if (personality && (personality.birthDate || personality.mbtiType || personality.speakingStyle)) {
      body.personality = personality;
    }
    const regRes = await apiRequest("POST", "/api/agents/register", body);
    const regData = await regRes.json();
    if (!regData.ok) throw new Error(regData.error || "注册失败");
    return { apiKey: regData.apiKey, personality: regData.personality };
  }, []);

  // Login with a known API key
  const agentLoginWithKey = useCallback(async (apiKey: string) => {
    const loginRes = await apiRequest("POST", "/api/auth/agent-login", { apiKey });
    const loginData = await loginRes.json();
    setToken(loginData.token);
    setUser(loginData.user);
    queryClient.clear();
  }, [setToken]);

  const agentRegisterAndLogin = useCallback(async (agentName: string, description: string, personality?: { birthDate?: string; birthHour?: number; mbtiType?: string; speakingStyle?: string }) => {
    const reg = await agentRegister(agentName, description, personality);
    await agentLoginWithKey(reg.apiKey);
    return { personality: reg.personality };
  }, [agentRegister, agentLoginWithKey]);

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
    <AuthContext.Provider value={{ user, token, isLoading, isGuest, login, register, agentLogin, agentRegister, agentLoginWithKey, agentRegisterAndLogin, enterGuestMode, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
