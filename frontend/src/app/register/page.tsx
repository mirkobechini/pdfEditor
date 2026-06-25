"use client";

import React from "react";
import { useI18n } from "../lib/i18n";
import { useAuth } from "../lib/auth";

export default function RegisterPage() {
  const { t } = useI18n();
  const { register } = useAuth();
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim() || !password.trim()) return;

    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    if (password.length < 6) {
      setError(t("auth.passwordTooShort"));
      return;
    }

    setLoading(true);
    try {
      await register(email.trim(), password, fullName.trim());
      window.location.href = "/";
    } catch (err) {
      setError(t("auth.registerFailed") + ": " + (err instanceof Error ? err.message : err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">{t("auth.registerTitle")}</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t("auth.fullName")}</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mario Rossi"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("auth.email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="email@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("auth.password")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("auth.confirmPassword")}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            disabled={loading || !fullName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()}
          >
            {loading ? t("auth.registering") : t("auth.registerButton")}
          </button>
        </form>

        <p className="mt-4 text-sm text-center text-gray-500 dark:text-gray-400">
          {t("auth.hasAccount")}{" "}
          <a href="/login" className="text-blue-500 hover:underline">
            {t("auth.loginLink")}
          </a>
        </p>
      </div>
    </div>
  );
}