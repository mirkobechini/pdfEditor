"use client";

import React from "react";
import { useTranslations } from "next-intl";
import type { BrowseDocument } from "../lib/documentsApi";

interface DocumentCardProps {
    doc: BrowseDocument;
    onOpen?: (doc: BrowseDocument) => void;
}

/**
 * Card per un documento del catalogo (microservizio pdf-documents-api).
 * Mostra copertina (se disponibile), titolo, autore, lingua e download count.
 */
export default function DocumentCard({ doc, onOpen }: DocumentCardProps) {
    const t = useTranslations("browse");

    const author = doc.authors && doc.authors.length > 0 ? doc.authors[0] : t("unknownAuthor");
    const language = doc.languages && doc.languages.length > 0 ? doc.languages[0] : "";

    return (
        <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
            data-testid="document-card"
        >
            <div className="h-40 bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                {doc.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={doc.cover_url}
                        alt={doc.title}
                        className="object-cover w-full h-full"
                    />
                ) : (
                    <div className="text-4xl text-gray-400 dark:text-gray-500"> 📄</div>
                )}
            </div>
            <div className="p-4 flex flex-col flex-1">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-2 mb-1">
                    {doc.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-1">{author}</p>
                <div className="mt-auto flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                    <span>{language}</span>
                    <span>{doc.download_count?.toLocaleString() ?? 0} ⬇</span>
                </div>
                {onOpen && doc.pdf_url && (
                    <button
                        onClick={() => onOpen(doc)}
                        className="mt-3 w-full py-1.5 text-xs font-medium rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                    >
                        {t("open")}
                    </button>
                )}
            </div>
        </div>
    );
}