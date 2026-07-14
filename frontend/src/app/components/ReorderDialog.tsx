"use client";

import React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { api } from "../lib/api";
import { downloadBlob } from "../lib/download";
import { usePdfJs } from "../lib/usePdfJs";

interface ReorderDialogProps {
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

export default function ReorderDialog({ open, onClose, selectedId, selectedName, totalPages, onSuccess }: ReorderDialogProps) {
  const t = useTranslations("reorderDialog");
  const [order, setOrder] = React.useState<number[]>([]);
  const [thumbnails, setThumbnails] = React.useState<PageThumbnail[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [reordering, setReordering] = React.useState(false);
  const [error, setError] = React.useState("");
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const [dropIndex, setDropIndex] = React.useState<number | null>(null);
  const pdfJsLoaded = usePdfJs();

  // Initialize order and load thumbnails when dialog opens
  React.useEffect(() => {
    if (open && selectedId && pdfJsLoaded) {
      setOrder(Array.from({ length: totalPages }, (_, i) => i + 1));
      setError("");
      setThumbnails([]);
      loadThumbnails();
    }
  }, [open, selectedId, totalPages, pdfJsLoaded]);

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
      setError(t("failed") + ": " + (err instanceof Error ? err.message : err));
    } finally {
      setLoading(false);
    }
  }

  function moveUp(index: number) {
    if (index === 0) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moveDown(index: number) {
    if (index === order.length - 1) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  const isOrderChanged = order.some((pageNum, pos) => pageNum !== pos + 1);

  async function handleReorder() {
    if (!selectedId || !isOrderChanged) return;
    setReordering(true);
    setError("");
    try {
      const result = await api.reorderPages(selectedId, order);
      const blob = await api.downloadPdf(result.id);
      downloadBlob(blob, `reordered_${selectedName}`);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(t("failed") + ": " + (err instanceof Error ? err.message : err));
    } finally {
      setReordering(false);
    }
  }

  // Drag & drop handlers
  function handleDragStart(pos: number) {
    setDragIndex(pos);
  }

  function handleDragOver(e: React.DragEvent, pos: number) {
    e.preventDefault();
    setDropIndex(pos);
  }

  function handleDragLeave() {
    setDropIndex(null);
  }

  function handleDrop(pos: number) {
    if (dragIndex === null || dragIndex === pos) return;
    setOrder((prev) => {
      const next = [...prev];
      const [removed] = next.splice(dragIndex, 1);
      next.splice(pos, 0, removed);
      return next;
    });
    setDragIndex(null);
    setDropIndex(null);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDropIndex(null);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">{t("title")}</h2>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {selectedName} ({totalPages} {t("pages")})
        </p>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" data-testid="loading-spinner"></div>
          </div>
        )}

        {!loading && thumbnails.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-4 overflow-y-auto p-1">
            {order.map((pageNum, pos) => {
              const thumb = thumbnails.find((t) => t.pageNum === pageNum);
              return (
                <div
                  key={pageNum}
                  className={`relative border rounded overflow-hidden cursor-grab active:cursor-grabbing transition-all ${dragIndex === pos
                    ? "opacity-50 border-blue-500 shadow-lg scale-95"
                    : dropIndex === pos
                      ? "border-blue-500 border-2"
                      : "border-gray-200 dark:border-gray-600 hover:border-blue-400"
                    }`}
                  draggable
                  onDragStart={() => handleDragStart(pos)}
                  onDragOver={(e) => handleDragOver(e, pos)}
                  onDragLeave={handleDragLeave}
                  onDrop={() => handleDrop(pos)}
                  onDragEnd={handleDragEnd}
                >
                  {thumb && (
                    <Image
                      src={thumb.dataUrl}
                      alt={t("pageThumbnail", { page: pageNum })}
                      width={200}
                      height={280}
                      className="w-full h-auto"
                      unoptimized
                    />
                  )}
                  <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                    {pos + 1}
                  </div>
                  <div className="absolute top-1 right-1 flex gap-0.5">
                    <button
                      className="bg-black/50 text-white text-xs px-1 hover:bg-black/70 rounded-l"
                      onClick={(e) => { e.stopPropagation(); moveUp(pos); }}
                      disabled={pos === 0}
                      title={t("moveUp")}
                    >
                      ▲
                    </button>
                    <button
                      className="bg-black/50 text-white text-xs px-1 hover:bg-black/70 rounded-r"
                      onClick={(e) => { e.stopPropagation(); moveDown(pos); }}
                      disabled={pos === order.length - 1}
                      title={t("moveDown")}
                    >
                      ▼
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && thumbnails.length === 0 && !error && (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500">
            <span className="text-4xl">📄</span>
            <p className="text-sm mt-2">{t("noPreview")}</p>
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
            disabled={!selectedId || !isOrderChanged || reordering}
            onClick={handleReorder}
          >
            {reordering ? t("reordering") : t("reorder")}
          </button>
        </div>
      </div>
    </div>
  );
}
