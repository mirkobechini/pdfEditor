"use client";

import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { api, cloudApi } from "./api";
import { isTauri } from "./tauri";
import type { User } from "./types";

const REMEMBER_TOKEN_KEY = "pdfeditor_remember_token";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isOffline: boolean;
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
  const [isOffline, setIsOffline] = useState(false);
  const _pendingAuthRef = React.useRef(false);

  // On mount: restore session from httpOnly cookie (browser sends it automatically)
  // Also check for remembered token in localStorage/Tauri store
  useEffect(() => {
    let cancelled = false;

    // Set up token refresh callback to persist new tokens
    api.onTokenRefreshed = (token: string, csrfToken: string) => {
      setIsOffline(false);
      if (isTauri()) {
        import("./tauri").then(({ tauriInvoke }) => {
          tauriInvoke("store_jwt", { token }).catch(() => { });
        });
      } else {
        localStorage.setItem(REMEMBER_TOKEN_KEY, token);
      }
    };
    // On refresh failure: enter offline mode instead of force logout
    api.onTokenRefreshFailed = () => {
      setIsOffline(true);
      // Keep the current token — it may still work for local operations
      // The user can still access local PDFs in offline mode
    };
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

      const token = api.getToken();
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const u = await api.getMe();
        if (!cancelled) {
          setUser(u);
          setIsOffline(false);
          api.refreshCsrf();
          return;
        }
      } catch {
        // Sidecar non pronto o utente non in SQLite locale — prova cloud
        if (token) {
          cloudApi.setToken(token);
          try {
            const u = await cloudApi.getMe();
            if (!cancelled) {
              setUser(u);
              setIsOffline(false);
              // Sync user to sidecar so local getMe/CSRF work
              await api.syncUser(u);
              // Refresh CSRF for both sidecar and cloud
              api.refreshCsrf();
              cloudApi.refreshCsrf();
              return;
            }
          } catch {
            // Neanche il cloud risponde — offline mode
            setIsOffline(true);
            // Keep the user from cache if we have one, otherwise null
          }
        }
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
      let res: { access_token: string; csrf_token?: string } | null = null;

      if (isTauri()) {
        // Desktop: prova login locale (SQLite) prima
        try {
          res = await api.login(email, password);
        } catch {
          // Utente non in SQLite locale — prova cloud
          res = null;
        }
        if (!res) {
          // Login via cloud — tieni il JWT cloud separato per cloudApi
          const cloudRes = await cloudApi.login(email, password);
          if (!cloudRes) throw new Error("Login failed");
          const cloudToken = cloudRes.access_token;

          // Sync utente cloud in SQLite locale con password
          cloudApi.setToken(cloudToken);
          const u = await cloudApi.getMe();
          api.setToken(cloudToken);
          const syncResult = await api.syncUser({ ...u, password });

          if (syncResult) {
            // JWT locale per il sidecar
            res = { access_token: syncResult.access_token, csrf_token: syncResult.csrf_token };
          } else {
            res = { access_token: cloudToken };
          }
          // cloudApi tiene il JWT cloud per operazioni future
          cloudApi.setToken(cloudToken);
        } else {
          // Login locale riuscito — prova anche cloud login per avere token cloud
          try {
            const cloudRes = await cloudApi.login(email, password);
            if (cloudRes) {
              cloudApi.setToken(cloudRes.access_token);
            }
          } catch {
            // Cloud non disponibile — cloudApi resta senza token
          }
        }
      } else {
        // Web: login sempre via cloud
        res = await cloudApi.login(email, password);
        if (!res) throw new Error("Login failed");
        cloudApi.setToken(res.access_token);
      }

      if (!res) throw new Error("Login failed");

      api.setToken(res.access_token);

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

      const u = await api.getMe();
      setUser(u);
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
      // Register sempre via cloud (Neon)
      const res = await cloudApi.register(email, password, fullName);
      api.setToken(res.access_token);
      cloudApi.setToken(res.access_token);

      if (isTauri()) {
        // Desktop: sync utente cloud in SQLite locale con password
        const u = await cloudApi.getMe();
        await api.syncUser({ ...u, password });
      }

      try {
        const u = await api.getMe();
        setUser(u);
      } catch {
        const u = await cloudApi.getMe();
        setUser(u);
      }
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
        // Persist token locally for offline use
        if (isTauri()) {
          const { tauriInvoke } = await import("./tauri");
          await tauriInvoke("store_jwt", { token }).catch(() => { });
        } else {
          localStorage.setItem(REMEMBER_TOKEN_KEY, token);
        }
        try {
          const u = await api.getMe();
          setUser(u);
          setIsOffline(false);
        } catch {
          const u = await cloudApi.getMe();
          setUser(u);
          setIsOffline(false);
        }
      } else {
        // Google id_token — exchange via cloud API
        const res = await cloudApi.googleLogin(token);
        api.setToken(res.access_token);
        cloudApi.setToken(res.access_token);
        // Persist token locally for offline use
        if (isTauri()) {
          const { tauriInvoke } = await import("./tauri");
          await tauriInvoke("store_jwt", { token: res.access_token }).catch(() => { });
        } else {
          localStorage.setItem(REMEMBER_TOKEN_KEY, res.access_token);
        }
        try {
          const u = await api.getMe();
          setUser(u);
          setIsOffline(false);
        } catch {
          const u = await cloudApi.getMe();
          setUser(u);
          setIsOffline(false);
          await api.syncUser(u);
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
      setIsOffline(false);
      localStorage.removeItem(REMEMBER_TOKEN_KEY);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isOffline, login, register, googleLogin, guestLogin, logout, setUser, isDesktop: isTauri() }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}