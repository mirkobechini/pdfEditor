import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { api } from "./api";
import type { User } from "./types";
import AsyncStorage from "@react-native-async-storage/async-storage";

const REMEMBER_TOKEN_KEY = "pdfeditor_remember_token";
const REMEMBER_USER_KEY = "pdfeditor_remember_user";

interface AuthContextValue {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string, remember?: boolean) => Promise<void>;
    register: (email: string, password: string, fullName: string) => Promise<void>;
    guestLogin: () => Promise<void>;
    logout: () => Promise<void>;
    forgotPassword: (email: string) => Promise<void>;
    setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true); // initial restore
    const [actionLoading, setActionLoading] = useState(false); // login/register/guest

    useEffect(() => {
        let cancelled = false;
        const safetyTimer = setTimeout(() => {
            if (!cancelled) setLoading(false);
        }, 4000);

        async function restoreSession() {
            try {
                const remembered = await AsyncStorage.getItem(REMEMBER_TOKEN_KEY);
                if (remembered && !cancelled) {
                    api.setToken(remembered);
                }
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000);
                try {
                    const res = await fetch("https://pdfeditor-api.mirkobechini.com/auth/me", {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${api.getToken() || ""}`,
                            "Content-Type": "application/json",
                        },
                        signal: controller.signal,
                    });
                    if (res.ok && !cancelled) {
                        const u = await res.json();
                        await AsyncStorage.setItem(REMEMBER_USER_KEY, JSON.stringify(u));
                        setUser(u);
                    } else if (remembered && !cancelled) {
                        // Token exists but expired — restore user from cached data
                        const cached = await AsyncStorage.getItem(REMEMBER_USER_KEY);
                        if (cached) {
                            setUser(JSON.parse(cached));
                        }
                    }
                } catch {
                    // Offline — restore user from cache (with real email, not guest)
                    if (remembered && !cancelled) {
                        const cached = await AsyncStorage.getItem(REMEMBER_USER_KEY);
                        if (cached) {
                            setUser(JSON.parse(cached));
                        }
                    }
                } finally {
                    clearTimeout(timeout);
                }
            } catch {
                // AsyncStorage error
            } finally {
                if (!cancelled) {
                    clearTimeout(safetyTimer);
                    setLoading(false);
                }
            }
        }

        restoreSession();
        return () => { cancelled = true; clearTimeout(safetyTimer); };
    }, []);

    const login = useCallback(async (email: string, password: string, remember?: boolean) => {
        setActionLoading(true);
        try {
            const res = await api.login(email, password);
            api.setToken(res.access_token);
            if (remember) {
                await AsyncStorage.setItem(REMEMBER_TOKEN_KEY, res.access_token);
            } else {
                await AsyncStorage.removeItem(REMEMBER_TOKEN_KEY);
            }
            const u = await api.getMe();
            // Save user data for offline restore
            await AsyncStorage.setItem(REMEMBER_USER_KEY, JSON.stringify(u));
            setUser(u);
        } catch (e) {
            throw e;
        } finally {
            setActionLoading(false);
        }
    }, []);

    const register = useCallback(async (email: string, password: string, fullName: string) => {
        setActionLoading(true);
        try {
            const res = await api.register(email, password, fullName);
            api.setToken(res.access_token);
            const u = await api.getMe();
            await AsyncStorage.setItem(REMEMBER_USER_KEY, JSON.stringify(u));
            setUser(u);
        } finally {
            setActionLoading(false);
        }
    }, []);

    const guestLogin = useCallback(async () => {
        setActionLoading(true);
        try {
            const res = await api.guestLogin();
            api.setToken(res.access_token);
            // Save guest token too so it persists across app restarts
            await AsyncStorage.setItem(REMEMBER_TOKEN_KEY, res.access_token);
            try {
                const u = await api.getMe();
                await AsyncStorage.setItem(REMEMBER_USER_KEY, JSON.stringify(u));
                setUser(u);
            } catch {
                // Login ok but getMe failed (offline) — still set a minimal user
                const guestUser = { id: "guest", email: null as any, full_name: "Guest", is_active: true, is_admin: false, is_guest: true, license_tier: "", license_tier_source: "", google_id: null, created_at: "", updated_at: "" };
                await AsyncStorage.setItem(REMEMBER_USER_KEY, JSON.stringify(guestUser));
                setUser(guestUser);
            }
        } finally {
            setActionLoading(false);
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
                await AsyncStorage.removeItem(REMEMBER_TOKEN_KEY);
                await AsyncStorage.removeItem(REMEMBER_USER_KEY);
            } catch { /* ignore */ }
        }
    }, []);

    const forgotPassword = useCallback(async (email: string) => {
        await api.forgotPassword(email);
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading: loading || actionLoading, login, register, guestLogin, logout, forgotPassword, setUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
    return ctx;
}