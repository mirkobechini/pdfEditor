"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { api, ShareLink } from "../lib/api";
import { mapError } from "../lib/error-map";

interface ShareDialogProps {
    open: boolean;
    onClose: () => void;
    pdfId: string | null;
}

export default function ShareDialog({ open, onClose, pdfId }: ShareDialogProps) {
    const t = useTranslations("shareDialog");
    const [links, setLinks] = React.useState<ShareLink[]>([]);
    const [password, setPassword] = React.useState("");
    const [expiresInDays, setExpiresInDays] = React.useState("");
    const [creating, setCreating] = React.useState(false);
    const [error, setError] = React.useState("");
    const [copiedToken, setCopiedToken] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (open && pdfId) {
            setError("");
            setCopiedToken(null);
            loadLinks();
        }
    }, [open, pdfId]);

    async function loadLinks() {
        if (!pdfId) return;
        try {
            const res = await api.listShareLinks(pdfId);
            setLinks(res);
        } catch (err) {
            setError(t("loadFailed") + ": " + mapError(err));
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
            setError(t("createFailed") + ": " + mapError(err));
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
            setError(t("revokeFailed") + ": " + mapError(err));
        }
    }

    function copyLink(token: string, url: string) {
        navigator.clipboard.writeText(url);
        setCopiedToken(token);
        setTimeout(() => setCopiedToken((t) => (t === token ? null : t)), 2000);
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
                <div className="flex-1 overflow-y-auto space-y-2">
                    {links.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-4" data-testid="share-empty">
                            {t("noLinks")}
                        </p>
                    )}
                    {links.map((link) => (
                        <div key={link.token} className="p-3 rounded border border-gray-200 dark:border-gray-700" data-testid={`share-link-${link.token}`}>
                            <p className="text-xs text-gray-500 dark:text-gray-400 break-all mb-1">{link.url}</p>
                            <div className="flex items-center gap-2 text-xs">
                                {link.has_password && <span className="text-gray-500">🔒</span>}
                                {link.expires_at && <span className="text-gray-500">{t("expires")}: {new Date(link.expires_at).toLocaleDateString()}</span>}
                                <button
                                    onClick={() => copyLink(link.token, link.url)}
                                    className="text-blue-600 hover:text-blue-700"
                                    data-testid={`share-copy-${link.token}`}
                                >
                                    {copiedToken === link.token ? t("copied") : t("copy")}
                                </button>
                                <button
                                    onClick={() => handleRevoke(link.token)}
                                    className="text-red-600 hover:text-red-700"
                                    data-testid={`share-revoke-${link.token}`}
                                >
                                    {t("revoke")}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    onClick={onClose}
                    className="mt-4 w-full py-2 rounded border border-gray-300 dark:border-gray-600 text-sm"
                >
                    {t("close")}
                </button>
            </div>
        </div>
    );
}