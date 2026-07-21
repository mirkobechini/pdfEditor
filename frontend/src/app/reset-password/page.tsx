"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import HeaderControls from "../components/HeaderControls";
import PasswordInput from "../components/PasswordInput";
import { mapError } from "../lib/error-map";

function ResetPasswordContent() {
    const t = useTranslations("auth");
    const { login } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token") || "";

    const [password, setPassword] = React.useState("");
    const [confirmPassword, setConfirmPassword] = React.useState("");
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);
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
                            <PasswordInput
                                value={password}
                                onChange={setPassword}
                                placeholder="••••••••"
                                autoFocus
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                                {t("confirmPassword")}
                            </label>
                            <PasswordInput
                                value={confirmPassword}
                                onChange={setConfirmPassword}
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

                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                        <a
                            href="/"
                            className="flex items-center justify-center text-sm text-blue-500 hover:underline gap-2"
                        >
                            🏠 {t("backToHome") || "Home"}
                        </a>
                    </div>
                </div>
            </div>
        </>
    );
}

export default function ResetPasswordPage() {
    return (
        <React.Suspense fallback={null}>
            <ResetPasswordContent />
        </React.Suspense>
    );
}