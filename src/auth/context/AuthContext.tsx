import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { getToken, setToken } from "../token";
import { fetchCurrentUser, requestToken, verifyLoginOtp } from "../authApi";
import type { AuthUser } from "../types";
import { queryClient } from "../../lib/queryClient";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  /** Resolves "ok" when signed in, "otp" when a verification code was emailed. */
  login: (email: string, password: string) => Promise<"ok" | "otp">;
  verifyOtp: (code: string, rememberDevice: boolean) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(getToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const pendingEmail = useRef<string | null>(null);

  async function loadUser() {
    const t = getToken();
    if (!t) {
      setUser(null);
      setTokenState(null);
      setLoading(false);
      return;
    }
    try {
      const u = await fetchCurrentUser();
      setUser(u);
      setTokenState(t);
    } catch {
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

  async function login(email: string, password: string): Promise<"ok" | "otp"> {
    const result = await requestToken(email, password);
    if (result.otpRequired) {
      pendingEmail.current = email;
      return "otp";
    }
    setTokenState(getToken());
    const u = await fetchCurrentUser();
    setUser(u);
    return "ok";
  }

  async function verifyOtp(code: string, rememberDevice: boolean): Promise<void> {
    const email = pendingEmail.current;
    if (!email) throw new Error("Please sign in again.");
    await verifyLoginOtp(email, code, rememberDevice);
    setTokenState(getToken());
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
    <AuthContext.Provider value={{ user, token, loading, login, verifyOtp, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
