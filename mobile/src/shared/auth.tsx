"use client";

import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { api } from "./api";
import type { User } from "./types";

const REMEMBER_TOKEN_KEY = "pdfeditor_remember_token";

interface AuthContextValue {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string, remember?: boolean) => Promise<void>;
    register: (email: string, password: string, fullName: string) => Promise<void>;
    guestLogin: () => Promise<void>;
    logout: () => Promise<void>;
    setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// AsyncStorage wrapper (lazy import for Expo compatibility)
let AsyncStorage: { getItem: (k: string) => Promise<string | null>; setItem: (k: string, v: string) => Promise<void>; removeItem: (k: string) => Promise<void> };

async function getAsyncStorage() {
    if (!AsyncStorage) {
        const mod = await import("@react-native-async-storage/async-storage");
        AsyncStorage = mod.default;
    }
    return AsyncStorage;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function restoreSession() {
            try {
                const storage = await getAsyncStorage();
                const remembered = await storage.getItem(REMEMBER_TOKEN_KEY);
                if (remembered) {
                    api.setToken(remembered);
                }
                try {
                    const u = await api.getMe();
                    if (!cancelled) {
                        setUser(u);
                        return;
                    }
                } catch {
                    // Offline — no session to restore
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        restoreSession();
        return () => { cancelled = true; };
    }, []);

    const login = useCallback(async (email: string, password: string, remember?: boolean) => {
        setLoading(true);
        try {
            const res = await api.login(email, password);
            api.setToken(res.access_token);
            if (remember) {
                const storage = await getAsyncStorage();
                await storage.setItem(REMEMBER_TOKEN_KEY, res.access_token);
            } else {
                const storage = await getAsyncStorage();
                await storage.removeItem(REMEMBER_TOKEN_KEY);
            }
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

    const guestLogin = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.guestLogin();
            api.setToken(res.access_token);
            try {
                const u = await api.getMe();
                setUser(u);
            } catch {
                // Login succeeded but getMe failed — ignore
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            await api.logout();
        } catch { /* ignore */ }
        finally {
            api.setToken(null);
            api.setCsrfToken(null);
            setUser(null);
            try {
                const storage = await getAsyncStorage();
                await storage.removeItem(REMEMBER_TOKEN_KEY);
            } catch { /* ignore */ }
        }
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, register, guestLogin, logout, setUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
    return ctx;
}