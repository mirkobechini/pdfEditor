"use client";

import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { api, cloudApi } from "./api";
import { isTauri } from "./tauri";
import type { User } from "./types";

const REMEMBER_TOKEN_KEY = "pdfeditor_remember_token";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  guestLogin: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  isDesktop: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const _pendingAuthRef = React.useRef(false);

  // On mount: restore session from httpOnly cookie (browser sends it automatically)
  // Also check for remembered token in localStorage/Tauri store
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      // Check localStorage first (web remember-me)
      const remembered = localStorage.getItem(REMEMBER_TOKEN_KEY);
      if (remembered) {
        api.setToken(remembered);
      }

      // Check Tauri store (desktop remember-me via store_jwt command)
      if (!remembered && isTauri()) {
        const { tauriInvoke } = await import("./tauri");
        const storedToken = await tauriInvoke<string>("load_jwt");
        if (storedToken) {
          api.setToken(storedToken);
        }
      }

      try {
        const u = await api.getMe();
        if (!cancelled) {
          setUser(u);
          api.refreshCsrf();
          return;
        }
      } catch {
        // Sidecar non pronto o utente non in SQLite locale — prova cloud
        const token = api.getToken();
        if (token) {
          cloudApi.setToken(token);
          try {
            const u = await cloudApi.getMe();
            if (!cancelled) {
              setUser(u);
              // Refresh CSRF for both sidecar and cloud
              api.refreshCsrf();
              cloudApi.refreshCsrf();
              return;
            }
          } catch {
            // Neanche il cloud risponde — offline
          }
        }
        localStorage.removeItem(REMEMBER_TOKEN_KEY);
      } finally {
        if (!cancelled && !_pendingAuthRef.current) {
          setLoading(false);
        }
      }
    }

    restoreSession();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email: string, password: string, remember?: boolean) => {
    _pendingAuthRef.current = true;
    setLoading(true);
    try {
      // Login via cloud (Neon) — SQLite locale non ha utenti registrati
      const res = await cloudApi.login(email, password);
      api.setToken(res.access_token);
      cloudApi.setToken(res.access_token);
      if (remember) {
        if (isTauri()) {
          const { tauriInvoke } = await import("./tauri");
          await tauriInvoke("store_jwt", { token: res.access_token });
        } else {
          localStorage.setItem(REMEMBER_TOKEN_KEY, res.access_token);
        }
      } else {
        localStorage.removeItem(REMEMBER_TOKEN_KEY);
      }
      try {
        const u = await api.getMe();
        setUser(u);
      } catch {
        // Fallback: getMe via cloud
        const u = await cloudApi.getMe();
        setUser(u);
      }
      // Refresh CSRF for both sidecar and cloud
      api.refreshCsrf();
      cloudApi.refreshCsrf();
    } finally {
      setLoading(false);
      _pendingAuthRef.current = false;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    _pendingAuthRef.current = true;
    setLoading(true);
    try {
      // Register via cloud (Neon)
      const res = await cloudApi.register(email, password, fullName);
      api.setToken(res.access_token);
      cloudApi.setToken(res.access_token);
      try {
        const u = await api.getMe();
        setUser(u);
      } catch {
        const u = await cloudApi.getMe();
        setUser(u);
      }
      // Refresh CSRF for both sidecar and cloud
      api.refreshCsrf();
      cloudApi.refreshCsrf();
    } finally {
      setLoading(false);
      _pendingAuthRef.current = false;
    }
  }, []);

  const googleLogin = useCallback(async (token: string) => {
    _pendingAuthRef.current = true;
    setLoading(true);
    try {
      // Desktop redirect flow: token is already a JWT from the sidecar
      // Web flow: token is a Google id_token, exchange it via cloud API
      if (token.startsWith("eyJ")) {
        // Already a JWT — set it directly
        api.setToken(token);
        cloudApi.setToken(token);
        try {
          const u = await api.getMe();
          setUser(u);
        } catch {
          const u = await cloudApi.getMe();
          setUser(u);
        }
      } else {
        // Google id_token — exchange via cloud API
        const res = await cloudApi.googleLogin(token);
        api.setToken(res.access_token);
        cloudApi.setToken(res.access_token);
        try {
          const u = await api.getMe();
          setUser(u);
        } catch {
          const u = await cloudApi.getMe();
          setUser(u);
        }
      }
      // Refresh CSRF for both sidecar and cloud
      api.refreshCsrf();
      cloudApi.refreshCsrf();
    } finally {
      setLoading(false);
      _pendingAuthRef.current = false;
    }
  }, []);

  const guestLogin = useCallback(async () => {
    _pendingAuthRef.current = true;
    setLoading(true);
    try {
      const res = await api.guestLogin();
      api.setToken(res.access_token);
      try {
        const u = await api.getMe();
        setUser(u);
      } catch {
        window.location.href = "/";
        return;
      }
      // Refresh CSRF for sidecar
      api.refreshCsrf();
    } finally {
      setLoading(false);
      _pendingAuthRef.current = false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      api.setToken(null);
      api.setCsrfToken?.(null);
      setUser(null);
      localStorage.removeItem(REMEMBER_TOKEN_KEY);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, googleLogin, guestLogin, logout, setUser, isDesktop: isTauri() }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}