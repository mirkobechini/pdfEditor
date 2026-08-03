"use client";

import React from "react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../messages/en.json";
import it from "../../messages/it.json";

type Locale = "it" | "en";

const messages: Record<Locale, typeof en> = { en, it };

const LocaleSetterCtx = React.createContext<(locale: Locale) => void>(() => { });

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = React.useState<Locale>("it");

    React.useEffect(() => {
        const stored = localStorage.getItem("locale");
        if (stored === "it" || stored === "en") setLocaleState(stored);
    }, []);

    const setLocale = React.useCallback((newLocale: Locale) => {
        setLocaleState(newLocale);
        localStorage.setItem("locale", newLocale);
    }, []);

    return (
        <LocaleSetterCtx.Provider value={setLocale}>
            <NextIntlClientProvider key={locale} locale={locale} messages={messages[locale]} timeZone="Europe/Rome">
                {children}
            </NextIntlClientProvider>
        </LocaleSetterCtx.Provider>
    );
}

export function useLocaleSetter() {
    return React.useContext(LocaleSetterCtx);
}