"use client";

import React from "react";
import { PDFDocument } from "pdf-lib";
import { useI18n } from "../lib/i18n";
import { api, PdfDocument as PdfDoc } from "../lib/api";

interface RemoveDialogProps {
  open: boolean;
  onClose: () => void;
  onRemoveComplete: (doc: PdfDoc) => void;
}

export default function RemoveDialog({ open, onClose, onRemoveComplete }: RemoveDialogProps) {
  const { t } = useI18n();
  const [files, setFiles] = React.useState<PdfDoc[]>([]);
  const [selectedFileId, setSelectedFileId] = React.useState<string>("");
  const [removing, setRemoving] = React.useState(false);
  const [error, setError] = React.useState("");
  // Set of page indices (0-based) to remove
  const [toRemove, setToRemove] = React.useState<Set<number>>(new Set());

  React.useEffect(() => {
    if (open) {
      api.listPdfs().then((res) => setFiles(res.items));
      setSelectedFileId("");
      setToRemove(new Set());
      setError("");
    }
  }, [open]);

  const selectedFile = files.find((f) => f.id === selectedFileId);
  const pageCount = selectedFile?.page_count ?? 0;

  function togglePage(idx: number) {
    setToRemove((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  const remaining = pageCount - toRemove.size;
  const canConfirm = remaining >= 1 && toRemove.size > 0;

  async function handleRemove() {
    if (!selectedFileId || !canConfirm) return;
    setRemoving(true);
    try {
      const blob = await api.downloadPdf(selectedFileId);
      const buffer = await blob.arrayBuffer();
      const srcPdf = await PDFDocument.load(buffer);

      const keepIndices = Array.from({ length: pageCount }, (_, i) => i).filter(
        (i) => !toRemove.has(i)
      );

      const newPdf = await PDFDocument.create();
      const copied = await newPdf.copyPages(srcPdf, keepIndices);
      copied.forEach((page) => newPdf.addPage(page));

      const bytes = await newPdf.save();
      const name = selectedFile
        ? `trimmed_${selectedFile.original_filename}`
        : "trimmed.pdf";
      const file = new File([bytes], name, { type: "application/pdf" });
      const doc = await api.uploadPdf(file);
      onRemoveComplete(doc);
      onClose();
    } catch (err) {
      setError(t("removeDialog.failed") + ": " + err);
    } finally {
      setRemoving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">{t("removeDialog.title")}</h2>

        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          {t("removeDialog.selectFile")}
        </label>
        <select
          value={selectedFileId}
          onChange={(e) => {
            setSelectedFileId(e.target.value);
            setToRemove(new Set());
            setError("");
          }}
          className="w-full mb-4 text-sm bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
        >
          <option value="">-- {t("removeDialog.choose")} --</option>
          {files.map((f) => (
            <option key={f.id} value={f.id}>
              {f.original_filename} ({f.page_count} {t("removeDialog.pages")})
            </option>
          ))}
        </select>

        {pageCount > 0 && (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {remaining} / {pageCount} {t("removeDialog.pagesRemaining")}
            </p>
            <div className="space-y-1 mb-4 max-h-60 overflow-y-auto">
              {Array.from({ length: pageCount }, (_, i) => i).map((idx) => (
                <label
                  key={idx}
                  className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={toRemove.has(idx)}
                    onChange={() => togglePage(idx)}
                    className="accent-red-500"
                  />
                  <span>{t("removeDialog.page")} {idx + 1}</span>
                </label>
              ))}
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 text-sm rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
            onClick={onClose}
          >
            {t("removeDialog.cancel")}
          </button>
          <button
            className="px-4 py-2 text-sm rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
            disabled={!canConfirm || removing}
            onClick={handleRemove}
          >
            {removing ? t("removeDialog.removing") : t("removeDialog.remove")}
          </button>
        </div>
      </div>
    </div>
  );
}