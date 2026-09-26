"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { usePdfJs } from "../lib/usePdfJs";
import { parsePageRangeList } from "../lib/print";

// Fixed "paper" size for the preview, based on an A4-ish ratio (1:1.414).
// Explicit px dimensions (rather than the CSS `aspect-ratio` property) avoid
// the box getting squashed by the surrounding flexbox's default shrink
// behavior, which otherwise distorted the landscape preview.
const PAPER_SHORT_PX = 260;
const PAPER_LONG_PX = Math.round(PAPER_SHORT_PX * 1.414);

export type PrintOrientation = "auto" | "portrait" | "landscape";
export type PrintMargin = "none" | "normal";
export type PrintColorMode = "color" | "grayscale";
export type PrintPageMode = "all" | "range";

export interface PrintOptions {
    orientation: PrintOrientation;
    margin: PrintMargin;
    color: PrintColorMode;
    /** "" means all pages; otherwise a range string like "1-3,5". */
    pageRange: string;
}

interface PrintOptionsModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (options: PrintOptions) => void;
    /** The PDF to render a live preview from. */
    pdfUrl?: string | null;
    /** Page to show in the preview when the dialog opens (defaults to 1). */
    initialPage?: number;
    totalPages?: number;
}

/**
 * In-app print options dialog (pages, color, orientation, margins) with a
 * live preview, matching the desktop app's dialog. Unlike desktop there is
 * no printer/copies selection or silent printing — the browser's own print
 * dialog handles printer and copies; this only decides which pages get
 * rendered and how, before handing off to `window.print()`.
 */
export default function PrintOptionsModal({ open, onClose, onConfirm, pdfUrl, initialPage = 1, totalPages = 1 }: PrintOptionsModalProps) {
    const t = useTranslations("printOptionsModal");
    const [orientation, setOrientation] = React.useState<PrintOrientation>("auto");
    const [margin, setMargin] = React.useState<PrintMargin>("normal");
    const [color, setColor] = React.useState<PrintColorMode>("color");
    const [pageMode, setPageMode] = React.useState<PrintPageMode>("all");
    const [pageRangeText, setPageRangeText] = React.useState("");

    // ── Live page preview (rendered on demand via pdf.js, not a static snapshot) ──
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const pdfDocRef = React.useRef<any>(null);
    const pdfJsLoaded = usePdfJs();
    // Index into `selectablePages` below — NOT a raw page number. Keeping the
    // preview constrained to an index into the actually-selected pages (all,
    // or the parsed range) means browsing it can never land on a page that
    // won't be printed.
    const [previewIndex, setPreviewIndex] = React.useState(0);
    const [previewLandscape, setPreviewLandscape] = React.useState(false);
    const [previewLoading, setPreviewLoading] = React.useState(false);

    const selectablePages = React.useMemo(
        () => parsePageRangeList(pageMode === "range" ? pageRangeText : "", totalPages),
        [pageMode, pageRangeText, totalPages],
    );
    const previewPage = selectablePages[Math.min(previewIndex, selectablePages.length - 1)] ?? 1;

    React.useEffect(() => {
        if (!open) return;
        setOrientation("auto");
        setMargin("normal");
        setColor("color");
        setPageMode("all");
        setPageRangeText("");
        setPreviewIndex(Math.max(0, Math.min(totalPages - 1, initialPage - 1)));
    }, [open, initialPage, totalPages]);

    // The loaded document is tied to pdfUrl — drop it as soon as the PDF changes
    // so the render effect below knows to fetch a fresh one.
    React.useEffect(() => {
        pdfDocRef.current = null;
    }, [pdfUrl]);

    // Load the PDF document (once per pdfUrl) and render whichever page is
    // currently selected. Keeping load + render in ONE effect (instead of two)
    // avoids a race where a slow real-world PDF load resolves after the user
    // already picked a different page, overwriting it with a stale page via a
    // closure that captured the old `previewPage` value.
    React.useEffect(() => {
        if (!open || !pdfUrl || !pdfJsLoaded) return;
        let cancelled = false;
        (async () => {
            if (!pdfDocRef.current) {
                const pdf = await (window as any).pdfjsLib.getDocument(pdfUrl).promise;
                if (cancelled) return;
                pdfDocRef.current = pdf;
            }
            if (cancelled) return;
            await renderPreviewPage(previewPage);
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, pdfUrl, pdfJsLoaded, previewPage]);

    async function renderPreviewPage(pageNum: number) {
        const doc = pdfDocRef.current;
        const canvas = canvasRef.current;
        if (!doc || !canvas) return;
        setPreviewLoading(true);
        try {
            const page = await doc.getPage(pageNum);
            const nativeViewport = page.getViewport({ scale: 1 });
            setPreviewLandscape(nativeViewport.width > nativeViewport.height);
            const scale = Math.min(1.8, PAPER_LONG_PX / nativeViewport.width);
            const viewport = page.getViewport({ scale });
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            await page.render({ canvasContext: ctx, viewport }).promise;
        } catch {
            // Ignore render races (e.g. dialog closed mid-render).
        } finally {
            setPreviewLoading(false);
        }
    }

    if (!open) return null;

    const orientationOptions: { value: PrintOrientation; label: string }[] = [
        { value: "auto", label: t("orientationAuto") },
        { value: "portrait", label: t("orientationPortrait") },
        { value: "landscape", label: t("orientationLandscape") },
    ];

    const marginOptions: { value: PrintMargin; label: string }[] = [
        { value: "normal", label: t("marginNormal") },
        { value: "none", label: t("marginNone") },
    ];

    const colorOptions: { value: PrintColorMode; label: string }[] = [
        { value: "color", label: t("colorColor") },
        { value: "grayscale", label: t("colorGrayscale") },
    ];

    // The paper's shape reflects the chosen print orientation — the content
    // itself is never rotated, matching how a real printer handles a
    // portrait page sent to a landscape sheet (scaled to fit, not spun).
    const paperIsLandscape = orientation === "auto" ? previewLandscape : orientation === "landscape";

    function handleConfirm() {
        onConfirm({
            orientation,
            margin,
            color,
            pageRange: pageMode === "range" ? pageRangeText.trim() : "",
        });
    }

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 p-8 flex flex-col sm:flex-row gap-8 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
                data-testid="print-options-modal"
            >
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
                                onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
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
                                onClick={() => setPreviewIndex((i) => Math.min(selectablePages.length - 1, i + 1))}
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

                <div className="flex-1 min-w-0 flex flex-col">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">{t("title")}</h2>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t("color")}
                        </label>
                        <div className="flex gap-2">
                            {colorOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setColor(opt.value)}
                                    data-testid={`print-color-${opt.value}`}
                                    aria-pressed={color === opt.value}
                                    className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-all duration-100 active:scale-95 ${
                                        color === opt.value
                                            ? "border-orange-600 bg-orange-600 text-white"
                                            : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {totalPages > 1 && (
                        <fieldset className="mb-4">
                            <legend className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t("pages")}
                            </legend>
                            <div className="flex gap-2 mb-2">
                                <button
                                    type="button"
                                    onClick={() => { setPageMode("all"); setPreviewIndex(0); }}
                                    data-testid="print-pages-all"
                                    aria-pressed={pageMode === "all"}
                                    className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-all duration-100 active:scale-95 ${
                                        pageMode === "all"
                                            ? "border-orange-600 bg-orange-600 text-white"
                                            : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`}
                                >
                                    {t("pagesAll")} ({totalPages})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setPageMode("range"); setPreviewIndex(0); }}
                                    data-testid="print-pages-range"
                                    aria-pressed={pageMode === "range"}
                                    className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-all duration-100 active:scale-95 ${
                                        pageMode === "range"
                                            ? "border-orange-600 bg-orange-600 text-white"
                                            : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`}
                                >
                                    {t("pagesRange")}
                                </button>
                            </div>
                            {pageMode === "range" && (
                                <input
                                    type="text"
                                    value={pageRangeText}
                                    onChange={(e) => { setPageRangeText(e.target.value); setPreviewIndex(0); }}
                                    placeholder={t("pagesRangePlaceholder")}
                                    data-testid="print-pages-range-input"
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
                                />
                            )}
                        </fieldset>
                    )}

                    <fieldset className="mb-4">
                        <legend className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t("orientation")}
                        </legend>
                        <div className="flex gap-2">
                            {orientationOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setOrientation(opt.value)}
                                    data-testid={`print-orientation-${opt.value}`}
                                    aria-pressed={orientation === opt.value}
                                    className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-all duration-100 active:scale-95 ${
                                        orientation === opt.value
                                            ? "border-orange-600 bg-orange-600 text-white"
                                            : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </fieldset>

                    <fieldset className="mb-6">
                        <legend className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t("margin")}
                        </legend>
                        <div className="flex gap-2">
                            {marginOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setMargin(opt.value)}
                                    data-testid={`print-margin-${opt.value}`}
                                    aria-pressed={margin === opt.value}
                                    className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-all duration-100 active:scale-95 ${
                                        margin === opt.value
                                            ? "border-orange-600 bg-orange-600 text-white"
                                            : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </fieldset>

                    <div className="mt-auto flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            {t("cancel")}
                        </button>
                        <button
                            onClick={handleConfirm}
                            data-testid="print-confirm"
                            className="flex-1 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium"
                        >
                            {t("print")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
