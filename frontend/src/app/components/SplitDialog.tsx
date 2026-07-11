"use client";

import React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { api } from "../lib/api";
import { downloadBlob } from "../lib/download";

interface SplitDialogProps {
  open: boolean;
  onClose: () => void;
  selectedId: string | null;
  selectedName: string;
  totalPages: number;
  onSuccess?: () => void;
}

interface PageThumbnail {
  pageNum: number;
  dataUrl: string;
}

export default function SplitDialog({ open, onClose, selectedId, selectedName, totalPages, onSuccess }: SplitDialogProps) {
  const t = useTranslations("splitDialog");
  const [splitting, setSplitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [thumbnails, setThumbnails] = React.useState<PageThumbnail[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [cuts, setCuts] = React.useState<Set<number>>(new Set());
  const [pdfJsLoaded, setPdfJsLoaded] = React.useState(false);

  // Load PDF.js on mount
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as any).pdfjsLib) {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      setPdfJsLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.async = true;
    script.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      setPdfJsLoaded(true);
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Initialize when dialog opens
  React.useEffect(() => {
    if (open) {
      setError("");
      setCuts(new Set());
      setThumbnails([]);
      if (selectedId && pdfJsLoaded) {
        loadThumbnails();
      }
    }
  }, [open, selectedId, pdfJsLoaded]);

  async function loadThumbnails() {
    if (!selectedId) return;
    setLoading(true);
    setError("");
    try {
      const blob = await api.downloadPdf(selectedId);
      const url = URL.createObjectURL(blob);
      const pdfjsLib = (window as any).pdfjsLib;
      const pdf = await pdfjsLib.getDocument(url).promise;

      const results: PageThumbnail[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.3 });
        const canvas = document.createElement("canvas");
        const dpr = window.devicePixelRatio || 1;
        canvas.width = viewport.width * dpr;
        canvas.height = viewport.height * dpr;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        const ctx = canvas.getContext("2d")!;
        ctx.scale(dpr, dpr);
        await page.render({ canvasContext: ctx, viewport }).promise;
        results.push({ pageNum: i, dataUrl: canvas.toDataURL("image/png") });
      }
      setThumbnails(results);
      URL.revokeObjectURL(url);
    } catch (err) {
      // Gracefully handle error (PDF deleted, race condition, etc.)
      console.debug("Failed to load thumbnails:", err);
      setError(t("failed") + ": " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  }

  function toggleCut(afterPage: number) {
    setCuts((prev) => {
      const next = new Set(prev);
      if (next.has(afterPage)) {
        next.delete(afterPage);
      } else {
        next.add(afterPage);
      }
      return next;
    });
  }

  function getPreviewSections(): { start: number; end: number }[] {
    if (cuts.size === 0) return [{ start: 1, end: totalPages }];
    const sortedCuts = Array.from(cuts).sort((a, b) => a - b);
    const sections: { start: number; end: number }[] = [];
    let start = 1;
    for (const cut of sortedCuts) {
      sections.push({ start, end: cut });
      start = cut + 1;
    }
    sections.push({ start, end: totalPages });
    return sections;
  }

  function getRangesFromCuts(): string[] {
    return getPreviewSections().map((s) =>
      s.start === s.end ? `${s.start}` : `${s.start}-${s.end}`,
    );
  }

  async function handleSplit() {
    if (!selectedId) return;
    const ranges = getRangesFromCuts();
    setSplitting(true);
    setError("");
    try {
      const result = await api.splitPdf(selectedId, "range", ranges);
      const docId = result.items?.[0]?.id;
      if (docId) {
        const blob = await api.downloadPdf(docId);
        downloadBlob(blob, `split_${selectedName}`);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(t("failed") + ": " + (err instanceof Error ? err.message : err));
    } finally {
      setSplitting(false);
    }
  }

  if (!open) return null;

  const sections = getPreviewSections();

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">{t("title")}</h2>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {selectedName} ({totalPages} {t("pages")})
        </p>

        {/* Thumbnails row with separators */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" data-testid="loading-spinner"></div>
          </div>
        )}

        {!loading && thumbnails.length > 0 && (
          <>
            <div className="flex gap-0 mb-4 overflow-x-auto pb-2 items-stretch">
              {thumbnails.map((thumb, idx) => (
                <React.Fragment key={thumb.pageNum}>
                  {/* Page thumbnail card */}
                  <div className="flex-shrink-0 w-20 border border-gray-200 dark:border-gray-600 rounded overflow-hidden">
                    <Image
                      src={thumb.dataUrl}
                      alt={t("pageThumbnail", { page: thumb.pageNum })}
                      width={200}
                      height={280}
                      className="w-full h-auto"
                      unoptimized
                    />
                    <div className="text-center text-xs py-0.5 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      {thumb.pageNum}
                    </div>
                  </div>

                  {/* Separator line (not after last page) */}
                  {idx < thumbnails.length - 1 && (
                    <div className="flex-shrink-0 flex items-stretch px-0.5">
                      <button
                        onClick={() => toggleCut(thumb.pageNum)}
                        className={`w-3 rounded transition-all cursor-pointer ${cuts.has(thumb.pageNum)
                          ? "bg-blue-500 shadow-md shadow-blue-300 dark:shadow-blue-800"
                          : "bg-gray-200 dark:bg-gray-600 hover:bg-blue-300 dark:hover:bg-blue-700"
                          }`}
                        title={cuts.has(thumb.pageNum) ? "Rimuovi separazione" : "Aggiungi separazione"}
                      />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Preview: resulting document groups */}
            <div className="mb-4">
              <p className="text-xs font-medium mb-2 text-gray-500 dark:text-gray-400">
                Documenti risultanti:
              </p>
              <div className="flex flex-wrap gap-2">
                {sections.map((sec, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded"
                  >
                    {idx > 0 && <span className="text-gray-400 mx-0.5">|</span>}
                    {sec.start === sec.end
                      ? `${t("page")} ${sec.start}`
                      : `${t("page")} ${sec.start}-${sec.end}`}
                  </span>
                ))}
              </div>
              {cuts.size === 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Clicca tra le pagine per aggiungere una separazione
                </p>
              )}
            </div>
          </>
        )}

        {!loading && thumbnails.length === 0 && (
          <div className="py-8 text-center text-gray-400 dark:text-gray-500">
            <p className="text-sm">Preview unavailable</p>
          </div>
        )}

        {error && <div className="mb-4 p-3 text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded">{error}</div>}

        <div className="flex justify-end gap-2 mt-auto pt-2 border-t dark:border-gray-700">
          <button
            className="px-4 py-2 text-sm rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
            onClick={onClose}
          >
            {t("cancel")}
          </button>
          <button
            className="px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
            disabled={!selectedId || splitting}
            onClick={handleSplit}
          >
            {splitting ? t("splitting") : t("split")}
          </button>
        </div>
      </div>
    </div>
  );
}
