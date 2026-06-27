"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "../lib/auth";
import HeaderControls from "../components/HeaderControls";

export default function LoginPage() {
  const t = useTranslations("auth");
  const { login } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
      window.location.href = "/";
    } catch (err) {
      setError(t("auth.loginFailed") + ": " + (err instanceof Error ? err.message : err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-end px-4 shrink-0">
        <HeaderControls />
      </header>
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <h1 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100">{t("auth.loginTitle")}</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t("auth.email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="email@example.com"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t("auth.password")}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 font-medium"
              disabled={loading || !email.trim() || !password.trim()}
            >
              {loading ? t("auth.loggingIn") : t("auth.loginButton")}
            </button>
          </form>

          <p className="mt-4 text-sm text-center text-gray-500 dark:text-gray-400">
            {t("auth.noAccount")}{" "}
            <a href="/register" className="text-blue-500 hover:underline">
              {t("auth.registerLink")}
            </a>
          </p>
        </div>
      </div>
    </>
  );
}