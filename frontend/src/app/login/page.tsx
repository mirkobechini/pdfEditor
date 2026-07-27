"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useAuth } from "../lib/auth";
import { mapError } from "../lib/error-map";
import HeaderControls from "../components/HeaderControls";
import PasswordInput from "../components/PasswordInput";
import MonkeyLogo from "../components/MonkeyLogo";
import { isTauri } from "../lib/tauri";

// Import GoogleLoginButton without SSR to avoid hydration mismatch
const GoogleLoginButton = dynamic(
  () => import("../components/GoogleLoginButton"),
  { ssr: false, loading: () => <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /> }
);

export default function LoginPage() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const { user, loading, login, guestLogin } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [remember, setRemember] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // If user is already authenticated (remember-me), redirect to editor
  React.useEffect(() => {
    if (!loading && user) {
      window.location.href = "/app";
    }
  }, [loading, user]);

  // Show login form after 5 seconds even if still loading (cold start fallback)
  const [showAnyway, setShowAnyway] = React.useState(false);
  React.useEffect(() => {
    const timer = setTimeout(() => setShowAnyway(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password, remember);
      window.location.href = "/app";
    } catch (err) {
      const key = mapError(err);
      // mapError returns keys like "auth.invalidCredentials" or "common.networkError"
      // t() is useTranslations("auth") so we need to strip the "auth." prefix
      const ns = key.split(".")[0];
      const k = key.substring(ns.length + 1);
      if (ns === "common") {
        setError(tc(k));
      } else {
        setError(t(k));
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Show loading while checking auth state (but show form after 5s anyway)
  if (loading && !showAnyway) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  // If already authenticated, don't render the form
  if (user) {
    return <div className="h-screen bg-gray-50 dark:bg-gray-900" />;
  }

  return (
    <>
      <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 shrink-0">
        <Link href="/" className="flex items-center gap-2 hover:opacity-75 transition-opacity">
          <MonkeyLogo />
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

          {/* Guest Access — Desktop only */}
          {isTauri() && (
            <button
              onClick={async () => {
                try {
                  await guestLogin();
                  window.location.href = "/app";
                } catch {
                  setError(t("loginFailed"));
                }
              }}
              className="w-full py-2 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium mb-4"
            >
              {t("guestLogin")}
            </button>
          )}

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
              <PasswordInput
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                required
              />
            </div>

            {/* Remember Me */}
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-orange-500 focus:ring-orange-500"
              />
              {t("rememberMe")}
            </label>

            {error && (
              <div className="p-3 text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2 text-sm rounded bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 font-medium"
              disabled={submitting || !email.trim() || !password.trim()}
            >
              {submitting ? t("loggingIn") : t("loginButton")}
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