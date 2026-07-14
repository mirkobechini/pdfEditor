"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { api, Metadata, PdfDocument } from "../lib/api";

interface MetadataDialogProps {
    open: boolean;
    onClose: () => void;
    pdfId: string | null;
    onSuccess?: (doc: PdfDocument) => void;
}

export default function MetadataDialog({ open, onClose, pdfId, onSuccess }: MetadataDialogProps) {
    const t = useTranslations("metadata");
    const [metadata, setMetadata] = React.useState<Metadata | null>(null);
    const [title, setTitle] = React.useState("");
    const [author, setAuthor] = React.useState("");
    const [subject, setSubject] = React.useState("");
    const [keywords, setKeywords] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState("");

    React.useEffect(() => {
        if (open && pdfId) {
            loadMetadata();
        }
    }, [open, pdfId]);

    async function loadMetadata() {
        if (!pdfId) return;
        setLoading(true);
        setError("");
        try {
            const data = await api.getMetadata(pdfId);
            setMetadata(data);
            setTitle(data.title || "");
            setAuthor(data.author || "");
            setSubject(data.subject || "");
            setKeywords(data.keywords || "");
        } catch (err) {
            setError(t("loadFailed") + ": " + (err instanceof Error ? err.message : err));
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        if (!pdfId) return;
        setSaving(true);
        setError("");
        try {
            const updated = await api.updateMetadata(pdfId, {
                title,
                author,
                subject,
                keywords,
            });
            setMetadata(updated);
            onSuccess?.(updated);
            onClose();
        } catch (err) {
            setError(t("saveFailed") + ": " + (err instanceof Error ? err.message : err));
        } finally {
            setSaving(false);
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

                {loading ? (
                    <p className="text-sm text-gray-400">{t("loading")}</p>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t("fieldTitle")}</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={t("titlePlaceholder")}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t("fieldAuthor")}</label>
                            <input
                                type="text"
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={t("authorPlaceholder")}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t("fieldSubject")}</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={t("subjectPlaceholder")}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t("fieldKeywords")}</label>
                            <input
                                type="text"
                                value={keywords}
                                onChange={(e) => setKeywords(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={t("keywordsPlaceholder")}
                            />
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
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? t("saving") : t("save")}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}