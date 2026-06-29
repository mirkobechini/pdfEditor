"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import HeaderControls from "../components/HeaderControls";

export default function ResetPasswordPage() {
    const t = useTranslations("auth");
    const { login } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token") || "";

    const [password, setPassword] = React.useState("");
    const [confirmPassword, setConfirmPassword] = React.useState("");
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [done, setDone] = React.useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!password.trim()) return;

        if (password !== confirmPassword) {
            setError(t("passwordMismatch"));
            return;
        }

        if (password.length < 6) {
            setError(t("passwordTooShort"));
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const user = await api.resetPassword(token, password);
            // Auto-login after reset
            await login(user.email, password);
            router.push("/");
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    }

    if (!token) {
        return (
            <>
                <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-end px-4 shrink-0">
                    <HeaderControls />
                </header>
                <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
                    <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
                        <p className="text-red-500">{t("resetInvalidToken")}</p>
                        <a href="/forgot-password" className="text-blue-500 hover:underline text-sm mt-4 block">
                            {t("requestNewReset")}
                        </a>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-end px-4 shrink-0">
                <HeaderControls />
            </header>
            <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
                <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
                    <h1 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100">
                        {t("resetTitle")}
                    </h1>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                                {t("newPassword")}
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="••••••••"
                                required
                                minLength={6}
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                                {t("confirmPassword")}
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
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
                            disabled={loading || !password.trim() || !confirmPassword.trim()}
                        >
                            {loading ? t("resetting") : t("resetButton")}
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}