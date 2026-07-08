"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useAuth } from "../lib/auth";
import HeaderControls from "../components/HeaderControls";
import GoogleLoginButton from "../components/GoogleLoginButton";

export default function RegisterPage() {
  const t = useTranslations("auth");
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
      setError(t("passwordMismatch"));
      return;
    }

    if (password.length < 6) {
      setError(t("passwordTooShort"));
      return;
    }

    setLoading(true);
    try {
      await register(email.trim(), password, fullName.trim());
      window.location.href = "/";
    } catch (err) {
      setError(t("registerFailed") + ": " + (err instanceof Error ? err.message : err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 shrink-0">
        <Link href="/" className="flex items-center gap-2 hover:opacity-75 transition-opacity">
          <Image
            src="/orange-monkey_logo.png"
            alt="PdfEditor Logo"
            width={32}
            height={32}
            className="rounded-lg"
            priority
          />
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">PdfEditor</span>
        </Link>
        <HeaderControls />
      </header>
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <h1 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100">{t("registerTitle")}</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t("fullName")}</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Mario Rossi"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t("email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="email@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t("password")}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t("confirmPassword")}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
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
              className="w-full py-2 text-sm rounded bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 font-medium"
              disabled={loading || !fullName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()}
            >
              {loading ? t("registering") : t("registerButton")}
            </button>
          </form>
          <div className="mt-4 mb-4 flex items-center gap-2">
            <hr className="flex-1 border-gray-300 dark:border-gray-600" />
            <span className="text-xs text-gray-400">or</span>
            <hr className="flex-1 border-gray-300 dark:border-gray-600" />
          </div>

          <GoogleLoginButton />
          <p className="mt-4 text-sm text-center text-gray-500 dark:text-gray-400">
            {t("hasAccount")}{" "}
            <a href="/login" className="text-blue-500 hover:underline">
              {t("loginLink")}
            </a>
          </p>
        </div>
      </div>
    </>
  );
}