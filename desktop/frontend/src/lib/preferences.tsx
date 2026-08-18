"use client";

import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { api } from "../shared/api";

export interface Preferences {
    theme: string;
    language: string;
    default_zoom: number;
    antialiasing: boolean;
    density: string;
}

interface PreferencesContextValue {
    prefs: Preferences;
    /** Update a preference locally (instant) and persist to backend */
    updatePrefs: (update: Partial<Preferences>) => void;
    /** Reload preferences from backend */
    reload: () => void;
}

const DEFAULT_PREFS: Preferences = {
    theme: "dark",
    language: "it",
    default_zoom: 100,
    antialiasing: true,
    density: "comfortable",
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
    const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);

    // Apply preferences to the DOM (global effects)
    const applyToDom = useCallback((p: Preferences) => {
        // Theme
        document.documentElement.classList.toggle("dark", p.theme === "dark");
        // Antialiasing
        document.body.style.setProperty("-webkit-font-smoothing", p.antialiasing ? "antialiased" : "auto");
        // Density
        document.documentElement.dataset.density = p.density;
    }, []);

    // Load preferences on mount
    useEffect(() => {
        let cancelled = false;
        api.getPreferences()
            .then((prefsData) => {
                const merged: Preferences = { ...DEFAULT_PREFS, ...prefsData };
                if (!cancelled) {
                    setPrefs(merged);
                    applyToDom(merged);
                }
            })
            .catch(() => {
                // Backend not ready — use defaults
            });
        return () => { cancelled = true; };
    }, [applyToDom]);

    const updatePrefs = useCallback((update: Partial<Preferences>) => {
        setPrefs((prev) => {
            const next = { ...prev, ...update };
            applyToDom(next);
            return next;
        });
        // Persist to backend (fire-and-forget)
        api.updatePreferences(update).catch(() => { });
    }, [applyToDom]);

    const reload = useCallback(() => {
        api.getPreferences().then((prefsData) => {
            const merged: Preferences = { ...DEFAULT_PREFS, ...prefsData };
            setPrefs(merged);
            applyToDom(merged);
        }).catch(() => { });
    }, [applyToDom]);

    return (
        <PreferencesContext.Provider value={{ prefs, updatePrefs, reload }}>
            {children}
        </PreferencesContext.Provider>
    );
}

export function usePreferences(): PreferencesContextValue {
    const ctx = useContext(PreferencesContext);
    if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
    return ctx;
}