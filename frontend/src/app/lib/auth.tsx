"use client";

import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { api } from "./api";

interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  license_tier: string;
  license_tier_source: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: restore session from httpOnly cookie (browser sends it automatically)
  useEffect(() => {
    api
      .getMe()
      .then((u) => setUser(u))
      .catch(() => {
        // Not authenticated — user is null
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.login(email, password);
      // Save token in memory for Bearer header (works cross-origin in local dev)
      api.setToken(res.access_token);
      // Also cookie-based — works on same-origin production
      const u = await api.getMe();
      setUser(u);
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    setLoading(true);
    try {
      const res = await api.register(email, password, fullName);
      api.setToken(res.access_token);
      const u = await api.getMe();
      setUser(u);
    } finally {
      setLoading(false);
    }
  }, []);

  const googleLogin = useCallback(async (idToken: string) => {
    setLoading(true);
    try {
      const res = await api.googleLogin(idToken);
      api.setToken(res.access_token);
      const u = await api.getMe();
      setUser(u);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    // Clear cookie by calling logout endpoint
    await api.logout();
    api.setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, googleLogin, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}