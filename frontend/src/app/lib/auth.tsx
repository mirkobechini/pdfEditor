"use client";

import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { isTauri } from "./tauri";

interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  is_guest: boolean;
  license_tier: string;
  license_tier_source: string;
  google_id: string | null;
  created_at: string;
  updated_at: string;
}

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
    const remembered = localStorage.getItem(REMEMBER_TOKEN_KEY);
    if (remembered) {
      api.setToken(remembered);
    }
    api
      .getMe()
      .then((u) => {
        setUser(u);
        api.refreshCsrf();
      })
      .catch(() => {
        // Not authenticated — user is null
        // Clear stale remembered token
        localStorage.removeItem(REMEMBER_TOKEN_KEY);
      })
      .finally(() => {
        if (!_pendingAuthRef.current) {
          setLoading(false);
        }
      });
  }, []);

  const login = useCallback(async (email: string, password: string, remember?: boolean) => {
    _pendingAuthRef.current = true;
    setLoading(true);
    try {
      const res = await api.login(email, password);
      api.setToken(res.access_token);
      // Save token for remember-me
      if (remember) {
        if (isTauri()) {
          // Desktop: store via Tauri invoke
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
        window.location.href = "/";
        return;
      }
    } finally {
      setLoading(false);
      _pendingAuthRef.current = false;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    _pendingAuthRef.current = true;
    setLoading(true);
    try {
      const res = await api.register(email, password, fullName);
      api.setToken(res.access_token);
      try {
        const u = await api.getMe();
        setUser(u);
      } catch {
        window.location.href = "/";
        return;
      }
    } finally {
      setLoading(false);
      _pendingAuthRef.current = false;
    }
  }, []);

  const googleLogin = useCallback(async (idToken: string) => {
    _pendingAuthRef.current = true;
    setLoading(true);
    try {
      const res = await api.googleLogin(idToken);
      api.setToken(res.access_token);
      try {
        const u = await api.getMe();
        setUser(u);
      } catch {
        window.location.href = "/";
        return;
      }
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
    } finally {
      setLoading(false);
      _pendingAuthRef.current = false;
    }
  }, []);

  const logout = useCallback(async () => {
    // Clear cookie by calling logout endpoint
    try {
      await api.logout();
    } finally {
      api.setToken(null);
      api.setCsrfToken?.(null);
      setUser(null);
      // Clear remember-me token
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