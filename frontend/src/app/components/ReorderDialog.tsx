"use client";

import React from "react";
import { PDFDocument } from "pdf-lib";
import { useI18n } from "../lib/i18n";
import { api, PdfDocument as PdfDoc } from "../lib/api";

interface ReorderDialogProps {
  open: boolean;
  onClose: () => void;
  onReorderComplete: (doc: PdfDoc) => void;
}

export default function ReorderDialog({ open, onClose, onReorderComplete }: ReorderDialogProps) {
  const { t } = useI18n();
  const [files, setFiles] = React.useState<PdfDoc[]>([]);
  const [selectedFileId, setSelectedFileId] = React.useState<string>("");
  const [order, setOrder] = React.useState<number[]>([]);
  const [reordering, setReordering] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (open) {
      api.listPdfs().then((res) => setFiles(res.items));
      setSelectedFileId("");
      setOrder([]);
      setError("");
    }
  }, [open]);

  function selectFile(id: string) {
    setSelectedFileId(id);
    const file = files.find((f) => f.id === id);
    if (file) {
      setOrder(Array.from({ length: file.page_count }, (_, i) => i));
    }
    setError("");
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

  const isOrderChanged =
    selectedFileId && order.some((pageIdx, pos) => pageIdx !== pos);

  async function handleReorder() {
    if (!selectedFileId || !isOrderChanged) return;
    setReordering(true);
    try {
      const blob = await api.downloadPdf(selectedFileId);
      const buffer = await blob.arrayBuffer();
      const srcPdf = await PDFDocument.load(buffer);
      const newPdf = await PDFDocument.create();
      const copied = await newPdf.copyPages(srcPdf, order);
      copied.forEach((page) => newPdf.addPage(page));
      const bytes = await newPdf.save();
      const selectedFile = files.find((f) => f.id === selectedFileId);
      const name = selectedFile
        ? `reordered_${selectedFile.original_filename}`
        : "reordered.pdf";
      const file = new File([bytes], name, { type: "application/pdf" });
      const doc = await api.uploadPdf(file);
      onReorderComplete(doc);
      onClose();
    } catch (err) {
      setError(t("reorderDialog.failed") + ": " + err);
    } finally {
      setReordering(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">{t("reorderDialog.title")}</h2>

        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          {t("reorderDialog.selectFile")}
        </label>
        <select
          value={selectedFileId}
          onChange={(e) => selectFile(e.target.value)}
          className="w-full mb-4 text-sm bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
        >
          <option value="">-- {t("reorderDialog.choose")} --</option>
          {files.map((f) => (
            <option key={f.id} value={f.id}>
              {f.original_filename} ({f.page_count} {t("reorderDialog.pages")})
            </option>
          ))}
        </select>

        {order.length > 0 && (
          <div className="space-y-1 mb-4 max-h-60 overflow-y-auto">
            {order.map((pageIdx, pos) => (
              <div
                key={pos}
                className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-700 text-sm"
              >
                <span>
                  {t("reorderDialog.page")} {pageIdx + 1}
                </span>
                <div className="flex gap-1">
                  <button
                    className="px-2 py-0.5 text-xs rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30"
                    onClick={() => moveUp(pos)}
                    disabled={pos === 0}
                  >
                    ▲
                  </button>
                  <button
                    className="px-2 py-0.5 text-xs rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30"
                    onClick={() => moveDown(pos)}
                    disabled={pos === order.length - 1}
                  >
                    ▼
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 text-sm rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
            onClick={onClose}
          >
            {t("reorderDialog.cancel")}
          </button>
          <button
            className="px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
            disabled={!isOrderChanged || reordering}
            onClick={handleReorder}
          >
            {reordering ? t("reorderDialog.reordering") : t("reorderDialog.reorder")}
          </button>
        </div>
      </div>
    </div>
  );
}