"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { api } from "../lib/api";
import { downloadBlob } from "../lib/download";

interface SplitDialogProps {
  open: boolean;
  onClose: () => void;
  selectedId: string | null;
  selectedName: string;
  totalPages: number;
}

interface PageThumbnail {
  pageNum: number;
  dataUrl: string;
}

export function parsePageRanges(input: string, maxPages: number): number[] {
  const pages = new Set<number>();
  const parts = input.split(",");
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const range = trimmed.split("-").map((s) => parseInt(s.trim(), 10));
    if (range.length === 1 && !isNaN(range[0])) {
      if (range[0] >= 1 && range[0] <= maxPages) pages.add(range[0]);
    } else if (range.length === 2 && !isNaN(range[0]) && !isNaN(range[1])) {
      const start = Math.max(1, range[0]);
      const end = Math.min(maxPages, range[1]);
      for (let i = start; i <= end; i++) pages.add(i);
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
}

export default function SplitDialog({ open, onClose, selectedId, selectedName, totalPages }: SplitDialogProps) {
  const t = useTranslations("app");
  const [pageInput, setPageInput] = React.useState("");
  const [splitting, setSplitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [thumbnails, setThumbnails] = React.useState<PageThumbnail[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedPages, setSelectedPages] = React.useState<Set<number>>(new Set());
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
      setPageInput("");
      setError("");
      setSelectedPages(new Set());
      setThumbnails([]);
      if (selectedId && pdfJsLoaded) {
        loadThumbnails();
      }
    }
  }, [open, selectedId, pdfJsLoaded]);

  async function loadThumbnails() {
    if (!selectedId) return;
    setLoading(true);
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
      console.error("Failed to load thumbnails:", err);
    } finally {
      setLoading(false);
    }
  }

  function togglePage(pageNum: number) {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageNum)) {
        next.delete(pageNum);
      } else {
        next.add(pageNum);
      }
      // Sync with text input
      const sorted = Array.from(next).sort((a, b) => a - b);
      setPageInput(sorted.join(","));
      return next;
    });
  }

  const parsedPages = pageInput ? parsePageRanges(pageInput, totalPages) : [];

  async function handleSplit() {
    if (!selectedId || parsedPages.length === 0) return;
    setSplitting(true);
    setError("");
    try {
      const result = await api.splitPdf(selectedId, "range", [
        parsedPages.join(","),
      ]);
      const docId = result.items?.[0]?.id;
      if (docId) {
        const blob = await api.downloadPdf(docId);
        downloadBlob(blob, `split_${selectedName}`);
      }
      onClose();
    } catch (err) {
      setError(t("splitDialog.failed") + ": " + err);
    } finally {
      setSplitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">{t("splitDialog.title")}</h2>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {selectedName} ({totalPages} {t("splitDialog.pages")})
        </p>

        {/* Thumbnails grid */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" data-testid="loading-spinner"></div>
          </div>
        )}

        {!loading && thumbnails.length > 0 && (
          <>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 mb-4 overflow-y-auto p-1">
              {thumbnails.map((thumb) => {
                const isSelected = selectedPages.has(thumb.pageNum);
                return (
                  <div
                    key={thumb.pageNum}
                    className={`relative border rounded overflow-hidden cursor-pointer transition-all ${
                      isSelected
                        ? "border-blue-500 ring-2 ring-blue-400"
                        : "border-gray-200 dark:border-gray-600 hover:border-blue-400"
                    }`}
                    onClick={() => togglePage(thumb.pageNum)}
                  >
                    <img
                      src={thumb.dataUrl}
                      alt={t("splitDialog.pageThumbnail", { page: thumb.pageNum })}
                      className="w-full h-auto"
                      draggable={false}
                    />
                    <div className={`absolute top-1 left-1 text-xs px-1.5 py-0.5 rounded ${
                      isSelected
                        ? "bg-blue-500 text-white"
                        : "bg-black/60 text-white"
                    }`}>
                      {thumb.pageNum}
                    </div>
                    {isSelected && (
                      <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                        <span className="text-white text-lg font-bold bg-blue-500 rounded-full w-6 h-6 flex items-center justify-center">✓</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected count and text input */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {selectedPages.size > 0
                  ? `${selectedPages.size} ${t("splitDialog.pagesSelected")}`
                  : t("splitDialog.clickToSelect")}
              </p>
              <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">
                {t("splitDialog.orTypeRange")}
              </label>
              <input
                type="text"
                value={pageInput}
                onChange={(e) => {
                  setPageInput(e.target.value);
                  // Sync selected pages from text input
                  const pages = parsePageRanges(e.target.value, totalPages);
                  setSelectedPages(new Set(pages));
                }}
                placeholder={t("splitDialog.pagePlaceholder")}
                className="w-full text-sm bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
              />
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <div className="flex justify-end gap-2 mt-auto pt-2 border-t dark:border-gray-700">
          <button
            className="px-4 py-2 text-sm rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
            onClick={onClose}
          >
            {t("splitDialog.cancel")}
          </button>
          <button
            className="px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
            disabled={!selectedId || parsedPages.length === 0 || splitting}
            onClick={handleSplit}
          >
            {splitting ? t("splitDialog.splitting") : t("splitDialog.split")}
          </button>
        </div>
      </div>
    </div>
  );
}
