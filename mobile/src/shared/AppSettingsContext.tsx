import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lightTheme, darkTheme } from "../theme";
import type { ThemeMode } from "../theme";

const THEME_MODE_KEY = "pdfeditor_theme_mode";
const LOCALE_KEY = "pdfeditor_locale";

interface AppSettingsContextValue {
    themeMode: ThemeMode;
    theme: typeof lightTheme;
    isDark: boolean;
    setThemeMode: (mode: ThemeMode) => Promise<void>;
    locale: string;
    setLocale: (locale: string) => Promise<void>;
}

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
    const colorScheme = useColorScheme();
    const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
    const [locale, setLocaleState] = useState("system");

    useEffect(() => {
        AsyncStorage.getItem(THEME_MODE_KEY).then((saved) => {
            if (saved === "light" || saved === "dark" || saved === "system") {
                setThemeModeState(saved);
            }
        });
        AsyncStorage.getItem(LOCALE_KEY).then((saved) => {
            if (saved === "system" || saved === "it" || saved === "en") {
                setLocaleState(saved);
                if (saved === "system") {
                    // Use system language
                    import("../i18n").then((m) => {
                        const sysLang = m.getSystemLanguage();
                        m.default.changeLanguage(sysLang);
                    });
                } else {
                    import("../i18n").then((m) => m.default.changeLanguage(saved));
                }
            } else {
                // First launch — use system language
                import("../i18n").then((m) => {
                    const sysLang = m.getSystemLanguage();
                    m.default.changeLanguage(sysLang);
                });
            }
        });
    }, []);

    const isDark = themeMode === "dark" || (themeMode === "system" && colorScheme === "dark");
    const theme = isDark ? darkTheme : lightTheme;

    const setThemeMode = useCallback(async (mode: ThemeMode) => {
        setThemeModeState(mode);
        await AsyncStorage.setItem(THEME_MODE_KEY, mode);
    }, []);

    const setLocale = useCallback(async (lng: string) => {
        setLocaleState(lng);
        await AsyncStorage.setItem(LOCALE_KEY, lng);
        const i18nModule = await import("../i18n");
        if (lng === "system") {
            const sysLang = i18nModule.getSystemLanguage();
            i18nModule.default.changeLanguage(sysLang);
        } else {
            i18nModule.default.changeLanguage(lng);
        }
    }, []);

    return (
        <AppSettingsContext.Provider value={{ themeMode, theme, isDark, setThemeMode, locale, setLocale }}>
            {children}
        </AppSettingsContext.Provider>
    );
}

export function useAppSettings() {
    const ctx = useContext(AppSettingsContext);
    if (!ctx) throw new Error("useAppSettings must be used within AppSettingsProvider");
    return ctx;
}