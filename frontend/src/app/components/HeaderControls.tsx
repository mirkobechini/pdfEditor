"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useLocaleControl } from "../lib/i18n";

export function ToggleDarkMode() {
  const t = useTranslations("darkMode");
  const [dark, setDark] = React.useState(() => {
    // Initialize from localStorage on first render (server-safe)
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("darkMode");
    return stored === "true" || (stored === null && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  // Sync dark mode changes to DOM and localStorage
  React.useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", String(dark));
  }, [dark]);

  // Listen for system preference changes (only when no explicit user choice)
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem("darkMode");
      if (stored === null) {
        setDark(e.matches);
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <button
      onClick={() => setDark(!dark)}
      className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
      title={t("toggle")}
      suppressHydrationWarning
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}

export function LanguageSelector() {
  const { locale, setLocale } = useLocaleControl();
  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as "it" | "en")}
      className="text-sm bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
    >
      <option value="it">IT</option>
      <option value="en">EN</option>
    </select>
  );
}

export default function HeaderControls() {
  return (
    <div className="flex items-center gap-3">
      <ToggleDarkMode />
      <LanguageSelector />
    </div>
  );
}