"use client";

import React from "react";
import { useI18n } from "../lib/i18n";

export function ToggleDarkMode() {
  const { t } = useI18n();
  const [dark, setDark] = React.useState(false);

  // On mount: restore from localStorage, fallback to system preference
  React.useEffect(() => {
    const stored = localStorage.getItem("darkMode");
    if (stored !== null) {
      const isDark = stored === "true";
      setDark(isDark);
      if (isDark) {
        document.documentElement.classList.add("dark");
      }
    } else {
      // First visit — check system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        setDark(true);
        document.documentElement.classList.add("dark");
      }
    }
  }, []);

  // Listen for system preference changes (only when no explicit user choice)
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem("darkMode");
      if (stored === null) {
        setDark(e.matches);
        if (e.matches) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  React.useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", String(dark));
  }, [dark]);

  return (
    <button
      onClick={() => setDark(!dark)}
      className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
      title={t("darkMode.toggle")}
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}

export function LanguageSelector() {
  const { locale, setLocale } = useI18n();
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