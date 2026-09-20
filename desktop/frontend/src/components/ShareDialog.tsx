"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { api, ShareLink } from "../shared/api";
import { useApiError } from "../hooks/useApiError";

interface ShareDialogProps {
    open: boolean;
    onClose: () => void;
    pdfId: string | null;
}

export default function ShareDialog({ open, onClose, pdfId }: ShareDialogProps) {
    const t = useTranslations("shareDialog");
    const { apiError } = useApiError();
    const [links, setLinks] = React.useState<ShareLink[]>([]);
    const [password, setPassword] = React.useState("");
    const [expiresInDays, setExpiresInDays] = React.useState("");
    const [creating, setCreating] = React.useState(false);
    const [error, setError] = React.useState("");
    const [copied, setCopied] = React.useState(false);

    React.useEffect(() => {
        if (open && pdfId) {
            setError("");
            setCopied(false);
            loadLinks();
        }
    }, [open, pdfId]);

    async function loadLinks() {
        if (!pdfId) return;
        try {
            const res = await api.listShareLinks(pdfId);
            setLinks(res);
        } catch (err) {
            setError(t("loadFailed") + ": " + apiError(err));
        }
    }

    async function handleCreate() {
        if (!pdfId) return;
        setCreating(true);
        setError("");
        try {
            const expires = expiresInDays ? parseInt(expiresInDays, 10) : undefined;
            const link = await api.createShareLink(
                pdfId,
                password.trim() || undefined,
                expires,
            );
            setLinks((prev) => [link, ...prev]);
            setPassword("");
            setExpiresInDays("");
        } catch (err) {
            setError(t("createFailed") + ": " + apiError(err));
        } finally {
            setCreating(false);
        }
    }

    async function handleRevoke(token: string) {
        if (!pdfId) return;
        try {
            await api.revokeShareLink(pdfId, token);
            setLinks((prev) => prev.filter((l) => l.token !== token));
        } catch (err) {
            setError(t("revokeFailed") + ": " + apiError(err));
        }
    }

    function copyLink(url: string) {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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
                    <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900/30 rounded" data-testid="share-error">
                        {error}
                    </div>
                )}

                {/* Create new link */}
                <div className="mb-4 space-y-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("createTitle")}</p>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t("passwordPlaceholder")}
                        className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                        data-testid="share-password"
                    />
                    <input
                        type="number"
                        min="1"
                        value={expiresInDays}
                        onChange={(e) => setExpiresInDays(e.target.value)}
                        placeholder={t("expiryPlaceholder")}
                        className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                        data-testid="share-expiry"
                    />
                    <button
                        onClick={handleCreate}
                        disabled={creating}
                        className="w-full py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
                        data-testid="share-create"
                    >
                        {creating ? t("creating") : t("create")}
                    </button>
                </div>

                {/* Existing links */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                    {links.length === 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t("noLinks")}</p>
                    )}
                    {links.map((link) => (
                        <div key={link.token} className="flex items-center gap-2 p-2 rounded border border-gray-300 dark:border-gray-600">
                            <span className="flex-1 min-w-0 truncate text-xs text-gray-700 dark:text-gray-300">{link.url}</span>
                            <button
                                onClick={() => copyLink(link.url)}
                                className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                                data-testid={`share-copy-${link.token}`}
                            >
                                {copied ? t("copied") : t("copy")}
                            </button>
                            <button
                                onClick={() => handleRevoke(link.token)}
                                className="px-2 py-1 text-xs rounded bg-red-500 hover:bg-red-600 text-white"
                                data-testid={`share-revoke-${link.token}`}
                            >
                                {t("revoke")}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="mt-4 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm"
                    >
                        {t("close")}
                    </button>
                </div>
            </div>
        </div>
    );
}