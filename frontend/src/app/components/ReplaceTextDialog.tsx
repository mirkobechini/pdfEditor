"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { api } from "../lib/api";

interface ReplaceTextDialogProps {
    open: boolean;
    onClose: () => void;
    pdfId: string | null;
}

export default function ReplaceTextDialog({ open, onClose, pdfId }: ReplaceTextDialogProps) {
    const t = useTranslations("replaceTextDialog");
    const [search, setSearch] = React.useState("");
    const [replaceWith, setReplaceWith] = React.useState("");
    const [replaceAll, setReplaceAll] = React.useState(true);
    const [replacing, setReplacing] = React.useState(false);
    const [error, setError] = React.useState("");

    async function handleReplace() {
        if (!pdfId || !search.trim()) return;
        setReplacing(true);
        setError("");
        try {
            const occurrence = replaceAll ? undefined : 1;
            await api.replaceText(pdfId, search, replaceWith, occurrence);
            setSearch("");
            setReplaceWith("");
            onClose();
        } catch (err) {
            setError(t("replaceFailed") + ": " + (err instanceof Error ? err.message : err));
        } finally {
            setReplacing(false);
        }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">{t("title")}</h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t("searchLabel")}</label>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t("searchPlaceholder")}
                            className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t("replaceLabel")}</label>
                        <input
                            type="text"
                            value={replaceWith}
                            onChange={(e) => setReplaceWith(e.target.value)}
                            placeholder={t("replacePlaceholder")}
                            className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="replaceAll"
                            checked={replaceAll}
                            onChange={(e) => setReplaceAll(e.target.checked)}
                            className="w-4 h-4 rounded border border-gray-300 dark:border-gray-600"
                        />
                        <label htmlFor="replaceAll" className="text-sm dark:text-gray-300 cursor-pointer">
                            {t("replaceAllLabel")}
                        </label>
                    </div>

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
                            className="px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                            onClick={handleReplace}
                            disabled={replacing || !search.trim()}
                        >
                            {replacing ? t("replacing") : t("replace")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
