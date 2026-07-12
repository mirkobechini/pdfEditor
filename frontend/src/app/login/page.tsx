"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useAuth } from "../lib/auth";
import HeaderControls from "../components/HeaderControls";

// Import GoogleLoginButton without SSR to avoid hydration mismatch
const GoogleLoginButton = dynamic(
  () => import("../components/GoogleLoginButton"),
  { ssr: false, loading: () => <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /> }
);

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
      window.location.href = "/app";
    } catch (err) {
      setError(t("loginFailed") + ": " + (err instanceof Error ? err.message : err));
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
          <h1 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100">{t("loginTitle")}</h1>

          {/* Google SSO - Primary Option */}
          <GoogleLoginButton />

          {/* Divider */}
          <div className="mt-6 mb-6 flex items-center gap-2">
            <hr className="flex-1 border-gray-300 dark:border-gray-600" />
            <span className="text-xs text-gray-400">or</span>
            <hr className="flex-1 border-gray-300 dark:border-gray-600" />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t("email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="email@example.com"
                required
                autoFocus
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
              disabled={loading || !email.trim() || !password.trim()}
            >
              {loading ? t("loggingIn") : t("loginButton")}
            </button>
          </form>

          <div className="mt-3 text-right">
            <a href="/forgot-password" className="text-xs text-orange-500 hover:underline">
              {t("forgotTitle")}?
            </a>
          </div>

          <p className="mt-6 text-sm text-center text-gray-500 dark:text-gray-400">
            {t("noAccount")}{" "}
            <a href="/register" className="text-blue-500 hover:underline">
              {t("registerLink")}
            </a>
          </p>
        </div>
      </div>
    </>
  );
}