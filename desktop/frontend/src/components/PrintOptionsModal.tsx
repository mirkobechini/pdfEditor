"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { isTauri, tauriInvoke } from "../shared/tauri";
import { parsePageRangeList } from "../shared/print";
import PrintPreviewPanel, { PAPER_LONG_PX, PAPER_SHORT_PX } from "./PrintPreviewPanel";
import SegmentedToggle from "./SegmentedToggle";

const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

// Re-exported for callers that imported it from this module directly
// (canonical implementation now lives in shared/src/print.ts).
export { parsePageRangeList };

export type PrintOrientation = "auto" | "portrait" | "landscape";
export type PrintMargin = "none" | "normal";
export type PrintColorMode = "color" | "grayscale";
export type PrintPageMode = "all" | "range";

export interface PrintOptions {
    orientation: PrintOrientation;
    margin: PrintMargin;
    /** Empty string when custom silent printing isn't available (browser fallback). */
    printerName: string;
    copies: number;
    color: PrintColorMode;
    /** "" means all pages; otherwise a range string like "1-3,5". */
    pageRange: string;
}

interface PrinterList {
    printers: string[];
    defaultPrinter: string | null;
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

export default function PrintOptionsModal({ open, onClose, onConfirm, pdfUrl, initialPage = 1, totalPages = 1 }: PrintOptionsModalProps) {
    const t = useTranslations("printOptionsModal");
    const [orientation, setOrientation] = React.useState<PrintOrientation>("auto");
    const [margin, setMargin] = React.useState<PrintMargin>("normal");
    const [color, setColor] = React.useState<PrintColorMode>("color");
    const [copies, setCopies] = React.useState(1);
    const [pageMode, setPageMode] = React.useState<PrintPageMode>("all");
    const [pageRangeText, setPageRangeText] = React.useState("");

    const supportsCustomPrint = isTauri();
    const [printers, setPrinters] = React.useState<string[]>([]);
    const [selectedPrinter, setSelectedPrinter] = React.useState("");
    const [loadingPrinters, setLoadingPrinters] = React.useState(false);
    const [printerError, setPrinterError] = React.useState("");

    // ── Live page preview (rendered on demand via pdf.js, not a static snapshot) ──
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const pdfDocRef = React.useRef<any>(null);
    const [pdfJsLoaded, setPdfJsLoaded] = React.useState(false);
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
        if ((window as any).pdfjsLib) {
            (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
            setPdfJsLoaded(true);
            return;
        }
        const script = document.createElement("script");
        script.src = PDFJS_URL;
        script.async = true;
        script.onload = () => {
            (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
            setPdfJsLoaded(true);
        };
        document.body.appendChild(script);
    }, []);

    React.useEffect(() => {
        if (!open) return;
        setOrientation("auto");
        setMargin("normal");
        setColor("color");
        setCopies(1);
        setPageMode("all");
        setPageRangeText("");
        setPrinterError("");
        setPreviewIndex(Math.max(0, Math.min(totalPages - 1, initialPage - 1)));

        if (!supportsCustomPrint) return;
        setLoadingPrinters(true);
        // tauriInvoke never rejects — it resolves to null on any IPC/command
        // error, which we treat the same as "couldn't load printers".
        tauriInvoke<PrinterList>("list_printers")
            .then((list) => {
                if (!list) {
                    setPrinters([]);
                    setSelectedPrinter("");
                    setPrinterError(t("printersFailed"));
                    return;
                }
                setPrinters(list.printers);
                setSelectedPrinter(list.defaultPrinter || list.printers[0] || "");
            })
            .finally(() => setLoadingPrinters(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` from useTranslations is not referentially stable; including it would re-run this on every render.
    }, [open, supportsCustomPrint, initialPage, totalPages]);

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
    const canConfirm = !supportsCustomPrint || (!loadingPrinters && selectedPrinter !== "");

    function handleConfirm() {
        onConfirm({
            orientation,
            margin,
            printerName: supportsCustomPrint ? selectedPrinter : "",
            copies,
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
                <PrintPreviewPanel
                    pdfUrl={pdfUrl}
                    totalPages={totalPages}
                    selectablePages={selectablePages}
                    previewPage={previewPage}
                    previewIndex={previewIndex}
                    onPreviewIndexChange={setPreviewIndex}
                    previewLoading={previewLoading}
                    paperIsLandscape={paperIsLandscape}
                    margin={margin}
                    color={color}
                    canvasRef={canvasRef}
                />

                <div className="flex-1 min-w-0 flex flex-col">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">{t("title")}</h2>

                    {supportsCustomPrint && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t("printer")}
                            </label>
                            {printerError ? (
                                <p className="text-xs text-red-600 dark:text-red-400" data-testid="print-printer-error">
                                    {printerError}
                                </p>
                            ) : loadingPrinters ? (
                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400" data-testid="print-printer-loading">
                                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
                                    {t("printersLoading")}
                                </div>
                            ) : (
                                <select
                                    value={selectedPrinter}
                                    onChange={(e) => setSelectedPrinter(e.target.value)}
                                    data-testid="print-printer-select"
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
                                >
                                    {printers.length === 0 && <option value="">{t("printersNone")}</option>}
                                    {printers.map((p) => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {supportsCustomPrint && (
                        <div className="mb-4 flex gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t("copies")}
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={99}
                                    value={copies}
                                    onChange={(e) => setCopies(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
                                    data-testid="print-copies"
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t("color")}
                                </label>
                                <SegmentedToggle
                                    options={colorOptions}
                                    selected={color}
                                    onSelect={setColor}
                                    testidPrefix="print-color"
                                />
                            </div>
                        </div>
                    )}

                    {supportsCustomPrint && totalPages > 1 && (
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
                        <SegmentedToggle
                            options={orientationOptions}
                            selected={orientation}
                            onSelect={setOrientation}
                            testidPrefix="print-orientation"
                        />
                    </fieldset>

                    <fieldset className="mb-6">
                        <legend className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t("margin")}
                        </legend>
                        <SegmentedToggle
                            options={marginOptions}
                            selected={margin}
                            onSelect={setMargin}
                            testidPrefix="print-margin"
                        />
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
                            disabled={!canConfirm}
                            data-testid="print-confirm"
                            className="flex-1 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium"
                        >
                            {t("print")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}