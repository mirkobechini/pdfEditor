"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { api } from "../shared/api";
import { useApiError } from "../hooks/useApiError";

interface OcrModalProps {
    open: boolean;
    onClose: () => void;
    pdfId: string | null;
    onSuccess?: () => void;
}

const LANGUAGES = [
    { code: "eng", label: "English" },
    { code: "ita", label: "Italiano" },
    { code: "fra", label: "Français" },
    { code: "deu", label: "Deutsch" },
    { code: "spa", label: "Español" },
];

export default function OcrModal({ open, onClose, pdfId, onSuccess }: OcrModalProps) {
    const t = useTranslations("ocrModal");
    const { apiError } = useApiError();
    const [language, setLanguage] = React.useState("eng");
    const [running, setRunning] = React.useState(false);
    const [error, setError] = React.useState("");

    React.useEffect(() => {
        if (open) {
            setError("");
            setLanguage("eng");
        }
    }, [open]);

    async function handleRun() {
        if (!pdfId) return;
        setRunning(true);
        setError("");
        try {
            await api.ocrPdf(pdfId, language);
            onSuccess?.();
            onClose();
        } catch (err) {
            setError(t("failed") + ": " + apiError(err));
        } finally {
            setRunning(false);
        }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">{t("title")}</h2>

                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t("description")}</p>

                {error && (
                    <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900/30 rounded" data-testid="ocr-error">
                        {error}
                    </div>
                )}

                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("language")}
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                        data-testid="ocr-language"
                    >
                        {LANGUAGES.map((lang) => (
                            <option key={lang.code} value={lang.code}>{lang.label}</option>
                        ))}
                    </select>
                </label>

                <div className="mt-4 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm"
                    >
                        {t("cancel")}
                    </button>
                    <button
                        onClick={handleRun}
                        disabled={running}
                        className="flex-1 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
                        data-testid="ocr-run"
                    >
                        {running ? t("running") : t("run")}
                    </button>
                </div>
            </div>
        </div>
    );
}