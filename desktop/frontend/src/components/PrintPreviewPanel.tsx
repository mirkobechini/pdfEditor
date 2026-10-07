"use client";

import React from "react";
import { useTranslations } from "next-intl";
import type { PrintColorMode, PrintMargin } from "./PrintOptionsModal";

// Fixed "paper" size for the preview, based on an A4-ish ratio (1:1.414).
// Explicit px dimensions (rather than the CSS `aspect-ratio` property) avoid
// the box getting squashed by the surrounding flexbox's default shrink
// behavior, which otherwise distorted the landscape preview.
export const PAPER_SHORT_PX = 260;
export const PAPER_LONG_PX = Math.round(PAPER_SHORT_PX * 1.414);

interface PrintPreviewPanelProps {
    pdfUrl?: string | null;
    totalPages: number;
    selectablePages: number[];
    previewPage: number;
    previewIndex: number;
    onPreviewIndexChange: React.Dispatch<React.SetStateAction<number>>;
    previewLoading: boolean;
    paperIsLandscape: boolean;
    margin: PrintMargin;
    color: PrintColorMode;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

/**
 * Left-hand column of the print dialog: the live page preview rendered on a
 * canvas (drawn by the parent, which owns the pdf.js document lifecycle) plus
 * the previous/next browsing controls.
 */
export default function PrintPreviewPanel({
    pdfUrl,
    totalPages,
    selectablePages,
    previewPage,
    previewIndex,
    onPreviewIndexChange,
    previewLoading,
    paperIsLandscape,
    margin,
    color,
    canvasRef,
}: PrintPreviewPanelProps) {
    const t = useTranslations("printOptionsModal");

    return (
        <div className="flex-1 min-w-0 flex flex-col items-center">
            <div className="w-full flex-1 min-h-[26rem] flex items-center justify-center bg-gray-100 dark:bg-gray-900 rounded-lg p-6 relative">
                {previewLoading && (
                    <span className="absolute top-3 right-3 inline-block h-4 w-4 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
                )}
                {pdfUrl ? (
                    <div
                        className="bg-white shadow-lg flex items-center justify-center shrink-0 transition-[width,height] duration-200 ease-out"
                        style={{
                            padding: margin === "none" ? 0 : "5%",
                            width: paperIsLandscape ? PAPER_LONG_PX : PAPER_SHORT_PX,
                            height: paperIsLandscape ? PAPER_SHORT_PX : PAPER_LONG_PX,
                        }}
                    >
                        <canvas
                            ref={canvasRef}
                            data-testid="print-preview-canvas"
                            style={{ filter: color === "grayscale" ? "grayscale(1)" : undefined }}
                            className="max-h-full max-w-full object-contain transition-[filter] duration-200"
                        />
                    </div>
                ) : (
                    <div className="text-xs text-gray-400 dark:text-gray-500">{t("previewUnavailable")}</div>
                )}
            </div>

            {pdfUrl && selectablePages.length > 1 && (
                <div className="flex items-center gap-3 mt-3">
                    <button
                        type="button"
                        onClick={() => onPreviewIndexChange((i) => Math.max(0, i - 1))}
                        disabled={previewIndex <= 0}
                        data-testid="print-preview-prev"
                        aria-label={t("previewPrev")}
                        className="h-7 w-7 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        ‹
                    </button>
                    <span className="text-xs text-gray-500 dark:text-gray-400" data-testid="print-preview-page-indicator">
                        {selectablePages.length === totalPages
                            ? `${previewPage} / ${totalPages}`
                            : `${t("previewPage")} ${previewPage} (${previewIndex + 1}/${selectablePages.length})`}
                    </span>
                    <button
                        type="button"
                        onClick={() => onPreviewIndexChange((i) => Math.min(selectablePages.length - 1, i + 1))}
                        disabled={previewIndex >= selectablePages.length - 1}
                        data-testid="print-preview-next"
                        aria-label={t("previewNext")}
                        className="h-7 w-7 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        ›
                    </button>
                </div>
            )}
            {pdfUrl && selectablePages.length === 1 && totalPages > 1 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3" data-testid="print-preview-page-indicator">
                    {t("previewPage")} {previewPage}
                </p>
            )}
        </div>
    );
}