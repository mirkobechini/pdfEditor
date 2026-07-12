"use client";

import React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { api } from "../lib/api";
import { downloadBlob } from "../lib/download";
import { usePdfJs } from "../lib/usePdfJs";

interface RemoveDialogProps {
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

export default function RemoveDialog({ open, onClose, selectedId, selectedName, totalPages, onSuccess }: RemoveDialogProps) {
  const t = useTranslations("removeDialog");
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [toRemove, setToRemove] = React.useState<Set<number>>(new Set());
  const [removing, setRemoving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [thumbnails, setThumbnails] = React.useState<PageThumbnail[]>([]);
  const [loading, setLoading] = React.useState(false);
  const pdfJsLoaded = usePdfJs();

  // Initialize when dialog opens
  React.useEffect(() => {
    if (open) {
      setToRemove(new Set());
      setConfirmOpen(false);
      setError("");
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
      console.debug("Failed to load thumbnails:", err);
      setError(t("failed") + ": " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  function togglePage(idx: number) {
    setToRemove((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  const remaining = totalPages - toRemove.size;
  const canConfirm = remaining >= 1 && toRemove.size > 0;

  async function handleRemove() {
    if (!selectedId || !canConfirm) return;
    setRemoving(true);
    setError("");
    try {
      const pageNumbers = Array.from(toRemove).map((i) => i + 1);
      const result = await api.removePages(selectedId, pageNumbers);
      const blob = await api.downloadPdf(result.id);
      downloadBlob(blob, `trimmed_${selectedName}`);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(t("failed") + ": " + (err instanceof Error ? err.message : err));
    } finally {
      setRemoving(false);
    }
  }

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

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          {t("pagesRemaining")}: {remaining}
        </p>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" data-testid="loading-spinner"></div>
          </div>
        )}

        {!loading && thumbnails.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 mb-4 overflow-y-auto p-1">
            {Array.from({ length: totalPages }, (_, i) => i).map((idx) => {
              const isSelected = toRemove.has(idx);
              const thumb = thumbnails[idx];
              return (
                <div
                  key={idx}
                  className={`relative border rounded overflow-hidden cursor-pointer transition-all ${isSelected
                    ? "border-red-500 ring-2 ring-red-400 opacity-60"
                    : "border-gray-200 dark:border-gray-600 hover:border-blue-400"
                    }`}
                  onClick={() => togglePage(idx)}
                >
                  {thumb && (
                    <Image
                      src={thumb.dataUrl}
                      alt={t("pageThumbnail", { page: idx + 1 })}
                      width={200}
                      height={280}
                      className="w-full h-auto"
                      unoptimized
                    />
                  )}
                  <div className={`absolute top-1 left-1 text-xs px-1.5 py-0.5 rounded ${isSelected
                    ? "bg-red-500 text-white"
                    : "bg-black/60 text-white"
                    }`}>
                    {idx + 1}
                  </div>
                  {isSelected && (
                    <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                      <span className="text-red-500 text-lg font-bold bg-white rounded-full w-6 h-6 flex items-center justify-center">✕</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && thumbnails.length === 0 && (
          <div className="py-8 text-center text-gray-400 dark:text-gray-500">
            <p className="text-sm">Preview unavailable</p>
          </div>
        )}

        {error && <div className="mb-4 p-3 text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded">{error}</div>}

        {confirmOpen ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-700 dark:text-red-300 mb-3 font-medium">
              {t("confirmMessage")}
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1.5 text-xs rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                onClick={() => setConfirmOpen(false)}
                disabled={removing}
              >
                {t("cancel")}
              </button>
              <button
                className="px-3 py-1.5 text-xs rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                disabled={removing}
                onClick={handleRemove}
              >
                {removing ? t("removing") : t("confirmDelete")}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end gap-2 mt-auto pt-2 border-t dark:border-gray-700">
            <button
              className="px-4 py-2 text-sm rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
              onClick={onClose}
            >
              {t("cancel")}
            </button>
            <button
              className="px-4 py-2 text-sm rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
              disabled={!selectedId || !canConfirm}
              onClick={() => setConfirmOpen(true)}
            >
              {t("remove")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
