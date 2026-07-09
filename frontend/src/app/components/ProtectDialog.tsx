"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { api } from "../lib/api";

interface ProtectDialogProps {
    open: boolean;
    onClose: () => void;
    pdfId: string | null;
}

export default function ProtectDialog({ open, onClose, pdfId }: ProtectDialogProps) {
    const t = useTranslations("protectDialog");
    const [password, setPassword] = React.useState("");
    const [confirmPassword, setConfirmPassword] = React.useState("");
    const [protecting, setProtecting] = React.useState(false);
    const [error, setError] = React.useState("");

    async function handleProtect() {
        if (!pdfId || !password.trim()) return;
        if (password !== confirmPassword) {
            setError(t("passwordMismatch"));
            return;
        }
        if (password.length < 4) {
            setError(t("passwordTooShort"));
            return;
        }

        setProtecting(true);
        setError("");
        try {
            await api.protectPdf(pdfId, password);
            setPassword("");
            setConfirmPassword("");
            onClose();
        } catch (err) {
            setError(t("protectFailed") + ": " + (err instanceof Error ? err.message : err));
        } finally {
            setProtecting(false);
        }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-lg font-bold mb-4">{t("title")}</h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t("passwordLabel")}</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t("passwordPlaceholder")}
                            className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t("confirmLabel")}</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder={t("confirmPlaceholder")}
                            className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <p className="text-xs text-gray-600 dark:text-gray-400">{t("securityNote")}</p>

                    {error && (
                        <div className="p-3 text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <button
                            className="px-4 py-2 text-sm rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                            onClick={onClose}
                        >
                            {t("cancel")}
                        </button>
                        <button
                            className="px-4 py-2 text-sm rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                            onClick={handleProtect}
                            disabled={protecting || !password.trim() || !confirmPassword.trim()}
                        >
                            {protecting ? t("protecting") : t("protect")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
