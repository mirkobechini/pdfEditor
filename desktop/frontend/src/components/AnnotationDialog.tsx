"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { api } from "../shared/api";
import { useApiError } from "../hooks/useApiError";

interface AnnotationDialogProps {
    open: boolean;
    onClose: () => void;
    pdfId: string | null;
    currentPage: number;
    onSuccess?: () => void;
}

const ANNOTATION_TYPES = ["highlight", "underline", "strikeout", "text", "free_text"];

export default function AnnotationDialog({ open, onClose, pdfId, currentPage, onSuccess }: AnnotationDialogProps) {
    const t = useTranslations("annotationDialog");
    const { apiError } = useApiError();
    const [type, setType] = React.useState("highlight");
    const [color, setColor] = React.useState("#FFFF00");
    const [content, setContent] = React.useState("");
    const [page, setPage] = React.useState(1);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState("");

    React.useEffect(() => {
        if (open) {
            setPage(currentPage);
            setError("");
            setContent("");
        }
    }, [open, currentPage]);

    async function handleSave() {
        if (!pdfId) return;
        setSaving(true);
        setError("");
        try {
            // Default rect covering a reasonable area of the page
            const rect = [50, 50, 250, 100];
            await api.addAnnotation(pdfId, {
                page,
                type: type as any,
                rect,
                color,
                content: content.trim() || null,
                opacity: 0.3,
            });
            onSuccess?.();
            onClose();
        } catch (err) {
            setError(t("failed") + ": " + apiError(err));
        } finally {
            setSaving(false);
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

                {error && (
                    <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900/30 rounded" data-testid="annotation-error">
                        {error}
                    </div>
                )}

                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("type")}
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                        data-testid="annotation-type"
                    >
                        {ANNOTATION_TYPES.map((t2) => (
                            <option key={t2} value={t2}>{t2}</option>
                        ))}
                    </select>
                </label>

                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mt-3">
                    {t("color")}
                    <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="mt-1 w-full h-10 rounded border border-gray-300 dark:border-gray-600"
                        data-testid="annotation-color"
                    />
                </label>

                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mt-3">
                    {t("page")}
                    <input
                        type="number"
                        min="1"
                        value={page}
                        onChange={(e) => setPage(parseInt(e.target.value, 10) || 1)}
                        className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                        data-testid="annotation-page"
                    />
                </label>

                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mt-3">
                    {t("content")}
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={3}
                        className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                        data-testid="annotation-content"
                    />
                </label>

                <div className="mt-4 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm"
                    >
                        {t("cancel")}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
                        data-testid="annotation-save"
                    >
                        {saving ? t("saving") : t("save")}
                    </button>
                </div>
            </div>
        </div>
    );
}