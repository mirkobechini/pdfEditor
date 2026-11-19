"use client";

import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { api } from "../shared/api";

export interface Preferences {
    theme: string;
    language: string;
    default_zoom: number;
    antialiasing: boolean;
    density: string;
    default_save_folder: string;
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
    default_save_folder: "",
};

// Fix 16/10 (QA Bug 2): la workspace (default_save_folder) si perdeva tra una build
// e l'altra perché il salvataggio era "fire-and-forget" SILENZIOSO: se la PUT
// /settings fallisce (token/backend non ancora pronti, o identità utente che varia
// tra installazioni) il valore restava solo in memoria e spariva al riavvio.
// Aggiungiamo una cache locale in localStorage ripristinata al mount, così la
// cartella sopravvive a riavvio/reinstall anche se il backend è momentaneamente
// non raggiungibile. Vista la persistenza locale, la facciamo valere come sua
// priorità alta per default_save_folder (niente più workspace persa).
const PREFS_CACHE_KEY = "pdfeditor_prefs_cache";

function loadPrefsCache(): Partial<Preferences> {
    try {
        const raw = localStorage.getItem(PREFS_CACHE_KEY);
        return raw ? (JSON.parse(raw) as Partial<Preferences>) : {};
    } catch {
        return {};
    }
}

function cachePrefs(p: Preferences) {
    try {
        localStorage.setItem(PREFS_CACHE_KEY, JSON.stringify(p));
    } catch {
        /* non critico */
    }
}

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
        const cached = loadPrefsCache();
        api.getPreferences()
            .then((prefsData) => {
                // Merge: il backend è la fonte, ma la cache locale preserva la
                // workspace anche se il backend non risponde/non è ancora su
                // (es. arrivo prima che l'identità sia pronta) — QA Bug 2.
                const merged: Preferences = {
                    ...DEFAULT_PREFS,
                    ...prefsData,
                    default_save_folder:
                        (prefsData.default_save_folder && prefsData.default_save_folder.trim())
                            ? prefsData.default_save_folder
                            : (cached.default_save_folder || ""),
                };
                cachePrefs(merged);
                if (!cancelled) {
                    setPrefs(merged);
                    applyToDom(merged);
                }
            })
            .catch(() => {
                // Backend non pronto: usiamo comunque la cache locale (se presente),
                // così la workspace non sparisce tra riavvii/aggiornamenti.
                if (cancelled) return;
                const fallback: Preferences = {
                    ...DEFAULT_PREFS,
                    ...cached,
                    default_save_folder: cached.default_save_folder || "",
                };
                setPrefs(fallback);
                applyToDom(fallback);
            });
        return () => { cancelled = true; };
    }, [applyToDom]);

    const updatePrefs = useCallback((update: Partial<Preferences>) => {
        setPrefs((prev) => {
            const next = { ...prev, ...update };
            applyToDom(next);
            cachePrefs(next); // persistenza locale di sicurezza (QA Bug 2)
            return next;
        });
        // Persist to backend: NON silenzioso — logghiamo l'errore se fallisce
        // (prima con .catch(() => {}) veniva ingoiato e la preferenza si perdeva).
        api.updatePreferences(update)
            .then((saved) => {
                if (saved) cachePrefs({ ...loadPrefsCache(), ...saved });
            })
            .catch((err) => {
                console.error("updatePreferences failed — restiamo comunque su cache locale:", err);
            });
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