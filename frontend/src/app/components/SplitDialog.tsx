"use client";

import React from "react";
import { PDFDocument } from "pdf-lib";
import { useI18n } from "../lib/i18n";
import { api, PdfDocument as PdfDoc } from "../lib/api";

interface SplitDialogProps {
  open: boolean;
  onClose: () => void;
  onSplitComplete: (doc: PdfDoc) => void;
}

function parsePageRanges(input: string, maxPages: number): number[] {
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

export default function SplitDialog({ open, onClose, onSplitComplete }: SplitDialogProps) {
  const { t } = useI18n();
  const [files, setFiles] = React.useState<PdfDoc[]>([]);
  const [selectedFileId, setSelectedFileId] = React.useState<string>("");
  const [pageInput, setPageInput] = React.useState("");
  const [splitting, setSplitting] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (open) {
      api.listPdfs().then((res) => setFiles(res.items));
      setSelectedFileId("");
      setPageInput("");
      setError("");
    }
  }, [open]);

  if (!open) return null;

  const selectedFile = files.find((f) => f.id === selectedFileId);
  const maxPages = selectedFile?.page_count ?? 0;
  const parsedPages = pageInput ? parsePageRanges(pageInput, maxPages) : [];

  async function handleSplit() {
    if (!selectedFileId || parsedPages.length === 0) return;
    setSplitting(true);
    try {
      const blob = await api.downloadPdf(selectedFileId);
      const buffer = await blob.arrayBuffer();
      const srcPdf = await PDFDocument.load(buffer);

      const newPdf = await PDFDocument.create();
      const pages = parsedPages.map((p) => p - 1); // zero-indexed
      const copied = await newPdf.copyPages(srcPdf, pages);
      copied.forEach((page) => newPdf.addPage(page));

      const bytes = await newPdf.save();
      const name = selectedFile
        ? `split_${selectedFile.original_filename}`
        : "split.pdf";
      const file = new File([bytes], name, { type: "application/pdf" });
      const doc = await api.uploadPdf(file);
      onSplitComplete(doc);
      onClose();
    } catch (err) {
      setError(t("splitDialog.failed") + ": " + err);
    } finally {
      setSplitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">{t("splitDialog.title")}</h2>

        {/* File select */}
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          {t("splitDialog.selectFile")}
        </label>
        <select
          value={selectedFileId}
          onChange={(e) => { setSelectedFileId(e.target.value); setPageInput(""); setError(""); }}
          className="w-full mb-4 text-sm bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
        >
          <option value="">-- {t("splitDialog.choose")} --</option>
          {files.map((f) => (
            <option key={f.id} value={f.id}>
              {f.original_filename} ({f.page_count} {t("splitDialog.pages")})
            </option>
          ))}
        </select>

        {/* Page input */}
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          {t("splitDialog.pageLabel")}
        </label>
        <input
          type="text"
          value={pageInput}
          onChange={(e) => setPageInput(e.target.value)}
          placeholder={t("splitDialog.pagePlaceholder")}
          disabled={!selectedFileId}
          className="w-full mb-2 text-sm bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 disabled:opacity-50"
        />
        {maxPages > 0 && (
          <p className="text-xs text-gray-500 mb-4">
            {t("splitDialog.available")}: 1–{maxPages}
          </p>
        )}

        {/* Preview */}
        {parsedPages.length > 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {parsedPages.length} {t("splitDialog.pagesSelected")}: {parsedPages.join(", ")}
          </p>
        )}

        {/* Error */}
        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        {/* Buttons */}
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 text-sm rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
            onClick={onClose}
          >
            {t("splitDialog.cancel")}
          </button>
          <button
            className="px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
            disabled={!selectedFileId || parsedPages.length === 0 || splitting}
            onClick={handleSplit}
          >
            {splitting ? t("splitDialog.splitting") : t("splitDialog.split")}
          </button>
        </div>
      </div>
    </div>
  );
}