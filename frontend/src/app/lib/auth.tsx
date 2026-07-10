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
  logout: () => void;
  token: string | null;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "pdfeditor_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: restore token from localStorage and validate
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      api.setToken(stored);
      setTokenState(stored);
      api
        .getMe()
        .then((u) => setUser(u))
        .catch(() => {
          // Token invalid — clear
          localStorage.removeItem(TOKEN_KEY);
          api.setToken(null);
          setTokenState(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.login(email, password);
      api.setToken(res.access_token);
      localStorage.setItem(TOKEN_KEY, res.access_token);
      setTokenState(res.access_token);
      const u = await api.getMe();
      setUser(u);
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    setLoading(true);
    try {
      await api.register(email, password, fullName);
      // Auto-login after register
      await login(email, password);
    } finally {
      setLoading(false);
    }
  }, [login]);

  const googleLogin = useCallback(async (idToken: string) => {
    setLoading(true);
    try {
      const res = await api.googleLogin(idToken);
      api.setToken(res.access_token);
      localStorage.setItem(TOKEN_KEY, res.access_token);
      setTokenState(res.access_token);
      const u = await api.getMe();
      setUser(u);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    api.setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    setTokenState(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, googleLogin, logout, token, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}