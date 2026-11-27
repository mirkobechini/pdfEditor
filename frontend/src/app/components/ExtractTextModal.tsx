"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { api } from "../lib/api";
import { mapError } from "../lib/error-map";
import type { TextExtraction } from "../lib/api-types";

interface ExtractTextModalProps {
    open: boolean;
    onClose: () => void;
    pdfId: string | null;
}

export default function ExtractTextModal({ open, onClose, pdfId }: ExtractTextModalProps) {
    const t = useTranslations("extractTextModal");
    const [page, setPage] = React.useState("");
    const [running, setRunning] = React.useState(false);
    const [error, setError] = React.useState("");
    const [result, setResult] = React.useState<TextExtraction | null>(null);
    const [copied, setCopied] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            setError("");
            setResult(null);
            setPage("");
            setCopied(false);
        }
    }, [open]);

    async function handleRun() {
        if (!pdfId) return;
        setRunning(true);
        setError("");
        setResult(null);
        setCopied(false);
        try {
            const pageNum = page.trim() ? parseInt(page, 10) : undefined;
            const res = await api.extractText(pdfId, pageNum);
            setResult(res);
        } catch (err) {
            setError(t("failed") + ": " + mapError(err));
        } finally {
            setRunning(false);
        }
    }

    async function handleCopy() {
        if (!result?.text) return;
        try {
            await navigator.clipboard.writeText(result.text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            // clipboard non disponibile — ignora silenziosamente
        }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">{t("title")}</h2>

                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t("description")}</p>

                {error && (
                    <div className="mb-4 p-3 text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded" data-testid="extract-text-error">
                        {error}
                    </div>
                )}

                {running && (
                    <div className="mb-4 p-3 text-sm text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center gap-2" data-testid="extract-text-processing">
                        <span className="inline-block h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                        {t("running")}
                    </div>
                )}

                {result && (
                    result.text.trim() ? (
                        <div className="mb-4 flex-1 min-h-0 flex flex-col">
                            <textarea
                                readOnly
                                value={result.text}
                                className="w-full flex-1 min-h-[160px] p-3 text-sm font-mono rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none"
                                data-testid="extract-text-result"
                            />
                            <button
                                onClick={handleCopy}
                                className="mt-2 self-start px-3 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                data-testid="extract-text-copy"
                            >
                                {copied ? t("copied") : t("copy")}
                            </button>
                        </div>
                    ) : (
                        <div className="mb-4 p-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/30 rounded" data-testid="extract-text-empty">
                            {t("empty")}
                        </div>
                    )
                )}

                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("page")}
                    <input
                        type="number"
                        min={1}
                        value={page}
                        onChange={(e) => setPage(e.target.value)}
                        disabled={running}
                        placeholder={t("pagePlaceholder")}
                        className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                        data-testid="extract-text-page"
                    />
                </label>

                <div className="mt-4 flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={running}
                        className="flex-1 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm"
                    >
                        {t("cancel")}
                    </button>
                    <button
                        onClick={handleRun}
                        disabled={running}
                        className="flex-1 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
                        data-testid="extract-text-run"
                    >
                        {running ? t("running") : t("run")}
                    </button>
                </div>
            </div>
        </div>
    );
}
