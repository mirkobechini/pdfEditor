"use client";

import React from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface ShareInfo {
    token: string;
    filename: string;
    has_password: boolean;
    expires_at: string | null;
}

interface ShareViewerProps {
    token: string;
}

export default function ShareViewer({ token }: ShareViewerProps) {
    const t = useTranslations("share");

    const [info, setInfo] = React.useState<ShareInfo | null>(null);
    const [password, setPassword] = React.useState("");
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
    const [unlocked, setUnlocked] = React.useState(false);

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    React.useEffect(() => {
        if (!token) return;
        setLoading(true);
        setError("");
        fetch(`${API_BASE}/share/${token}`)
            .then((res) => {
                if (!res.ok) throw new Error("not_found");
                return res.json();
            })
            .then((data: ShareInfo) => {
                setInfo(data);
                if (!data.has_password) {
                    loadPdf(data.token);
                }
            })
            .catch(() => setError(t("notFound")))
            .finally(() => setLoading(false));
    }, [token]);

    async function loadPdf(tok: string) {
        try {
            const res = await fetch(`${API_BASE}/share/${tok}/download`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: password || null }),
            });
            if (!res.ok) {
                if (res.status === 401) {
                    setError(t("wrongPassword"));
                } else {
                    setError(t("notFound"));
                }
                return;
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
            setUnlocked(true);
            setError("");
        } catch {
            setError(t("notFound"));
        }
    }

    function handleUnlock(e: React.FormEvent) {
        e.preventDefault();
        if (!info) return;
        loadPdf(info.token);
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {loading ? (
                <div className="text-center py-16 text-gray-400" data-testid="share-loading">
                    {t("loading")}
                </div>
            ) : error && !unlocked ? (
                <div className="text-center py-16">
                    <p className="text-lg text-gray-600 dark:text-gray-300 mb-4" data-testid="share-error">
                        {error}
                    </p>
                    <Link href="/landing" className="text-blue-600 hover:text-blue-700">
                        {t("backHome")}
                    </Link>
                </div>
            ) : info && !unlocked ? (
                <div className="max-w-md mx-auto mt-16 p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <h1 className="text-xl font-bold mb-2">{t("protectedTitle")}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        {t("protectedDesc")}: {info.filename}
                    </p>
                    <form onSubmit={handleUnlock} className="space-y-3">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t("passwordPlaceholder")}
                            className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                            data-testid="share-password-input"
                        />
                        <button
                            type="submit"
                            className="w-full py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
                            data-testid="share-unlock"
                        >
                            {t("unlock")}
                        </button>
                    </form>
                </div>
            ) : pdfUrl ? (
                <div className="flex flex-col h-[80vh]">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-lg font-bold truncate">{info?.filename}</h1>
                        <a
                            href={pdfUrl}
                            download={info?.filename || "shared.pdf"}
                            className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
                            data-testid="share-download"
                        >
                            {t("download")}
                        </a>
                    </div>
                    <iframe
                        src={pdfUrl}
                        className="w-full flex-1 rounded border border-gray-200 dark:border-gray-700"
                        title={info?.filename || "PDF"}
                        data-testid="share-pdf-viewer"
                    />
                </div>
            ) : null}
        </div>
    );
}