"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { api } from "../lib/api";
import HeaderControls from "../components/HeaderControls";
import { mapError } from "../lib/error-map";

export default function ForgotPasswordPage() {
    const t = useTranslations("auth");
    const [email, setEmail] = React.useState("");
    const [sent, setSent] = React.useState(false);
    const [sentMessage, setSentMessage] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!email.trim()) return;

        setLoading(true);
        setError(null);
        try {
            await api.forgotPassword(email.trim());
            setSentMessage(t("resetSent"));
            setSent(true);
        } catch (err) {
            setError(mapError(err));
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
                    <h1 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100">
                        {t("forgotTitle")}
                    </h1>

                    {sent ? (
                        <div>
                            <div className="p-4 text-sm text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 rounded mb-4">
                                {sentMessage || t("resetSent")}
                            </div>
                            <a
                                href="/login"
                                className="block text-center text-sm text-blue-500 hover:underline"
                            >
                                {t("backToLogin")}
                            </a>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {t("forgotDescription")}
                            </p>

                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                                    {t("email")}
                                </label>
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

                            {error && (
                                <div className="p-3 text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 font-medium"
                                disabled={loading || !email.trim()}
                            >
                                {loading ? t("sending") : t("sendResetLink")}
                            </button>

                            <p className="text-sm text-center">
                                <a
                                    href="/login"
                                    className="text-blue-500 hover:underline"
                                >
                                    {t("backToLogin")}
                                </a>
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </>
    );
}