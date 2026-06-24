"use client";

import React, { createContext, useContext, useCallback } from "react";
import en from "../../../messages/en.json";
import it from "../../../messages/it.json";

type Messages = typeof en;
type Locale = "it" | "en";

const messages: Record<Locale, Messages> = { en, it };

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getNestedValue(obj: any, path: string): string {
  const keys = path.split(".");
  let current = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return path;
    current = current[key];
  }
  return typeof current === "string" ? current : path;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>("it");

  React.useEffect(() => {
    const stored = localStorage.getItem("locale");
    if (stored === "it" || stored === "en") setLocaleState(stored);
  }, []);

  const setLocale = useCallback(
    (newLocale: Locale) => {
      setLocaleState(newLocale);
      localStorage.setItem("locale", newLocale);
    },
    []
  );

  const t = useCallback(
    (key: string) => getNestedValue(messages[locale], key),
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}