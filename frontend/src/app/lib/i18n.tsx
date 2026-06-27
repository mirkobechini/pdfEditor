"use client";

import React from "react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../messages/en.json";
import it from "../../../messages/it.json";

type Locale = "it" | "en";

const messages: Record<Locale, typeof en> = { en, it };

const LocaleCtx = React.createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
}>({ locale: "it", setLocale: () => {} });

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
    <LocaleCtx.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages[locale]}>
        {children}
      </NextIntlClientProvider>
    </LocaleCtx.Provider>
  );
}

export function useLocaleControl() {
  return React.useContext(LocaleCtx);
}