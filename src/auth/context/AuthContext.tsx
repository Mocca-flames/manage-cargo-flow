import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getToken, setToken } from "../token";
import { fetchCurrentUser, requestToken } from "../authApi";
import type { AuthUser } from "../types";
import { queryClient } from "../../lib/queryClient";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(getToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadUser() {
    const t = getToken();
    if (!t) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const u = await fetchCurrentUser();
      setUser(u);
    } catch (e) {
      setToken(null);
      setTokenState(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUser();
    const onExpired = () => {
      logout();
    };
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  async function login(email: string, password: string) {
    const t = await requestToken(email, password);
    setToken(t);
    setTokenState(t);
    const u = await fetchCurrentUser();
    setUser(u);
  }

  function logout() {
    setToken(null);
    setTokenState(null);
    setUser(null);
    queryClient.clear();
    window.location.href = "/login";
  }

  async function refresh() {
    await loadUser();
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
