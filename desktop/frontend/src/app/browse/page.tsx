"use client";

import React from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { documentsApi, BrowseDocument } from "../../lib/documentsApi";
import DocumentCard from "../../components/DocumentCard";
import { isTauri, tauriInvoke } from "../../shared/tauri";

export default function BrowsePage() {
    const t = useTranslations("browse");
    const [docs, setDocs] = React.useState<BrowseDocument[]>([]);
    const [query, setQuery] = React.useState("");
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [total, setTotal] = React.useState(0);
    const [page, setPage] = React.useState(1);
    const pageSize = 12;

    const load = React.useCallback(async (q: string, p: number) => {
        setLoading(true);
        setError(null);
        try {
            const res = q
                ? await documentsApi.searchDocuments(q, p, pageSize)
                : await documentsApi.listDocuments(p, pageSize);
            setDocs(res.items);
            setTotal(res.total);
        } catch (err) {
            console.error("Failed to load documents:", err);
            setError(t("error"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    React.useEffect(() => {
        load(query, page);
    }, [load, query, page]);

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        setPage(1);
        load(query, 1);
    }

    function openDocument(doc: BrowseDocument) {
        if (!doc.pdf_url) return;
        if (isTauri()) {
            tauriInvoke("plugin:opener|open_url", { url: doc.pdf_url });
        } else {
            window.open(doc.pdf_url, "_blank", "noopener,noreferrer");
        }
    }

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4">
                <Link href="/app" className="flex items-center gap-2 hover:opacity-75">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center text-white text-xs font-bold">P</div>
                    <span className="font-bold">PdfEditor</span>
                </Link>
            </header>

            <div className="max-w-6xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t("subtitle")}</p>

                <form onSubmit={handleSearch} className="mb-6 flex gap-2">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t("searchPlaceholder")}
                        className="flex-1 px-4 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        data-testid="browse-search-input"
                    />
                    <button
                        type="submit"
                        className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
                        data-testid="browse-search-button"
                    >
                        {t("search")}
                    </button>
                </form>

                {error && (
                    <div className="mb-6 p-4 rounded bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm" data-testid="browse-error">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-16 text-gray-400" data-testid="browse-loading">
                        {t("loading")}
                    </div>
                ) : docs.length === 0 ? (
                    <div className="text-center py-16 text-gray-400" data-testid="browse-empty">
                        {t("empty")}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" data-testid="browse-grid">
                            {docs.map((doc) => (
                                <DocumentCard key={doc.id} doc={doc} onOpen={openDocument} />
                            ))}
                        </div>

                        <div className="mt-8 flex items-center justify-center gap-4">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-40"
                                data-testid="browse-prev"
                            >
                                {t("prev")}
                            </button>
                            <span className="text-sm text-gray-500">
                                {t("page")} {page} / {totalPages}
                            </span>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-40"
                                data-testid="browse-next"
                            >
                                {t("next")}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}