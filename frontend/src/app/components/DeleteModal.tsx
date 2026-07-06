"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { api, PdfDocument } from "../lib/api";
import PdfThumbnail from "./PdfThumbnail";

interface DeleteModalProps {
  open: boolean;
  onClose: () => void;
  file: PdfDocument | null;
  onConfirm: () => void;
}

export default function DeleteModal({ open, onClose, file, onConfirm }: DeleteModalProps) {
  const t = useTranslations("deleteModal");
  const [deleting, setDeleting] = React.useState(false);

  async function handleConfirm() {
    if (!file) return;
    setDeleting(true);
    try {
      await api.deletePdf(file.id);
      onConfirm();
    } catch (err) {
      console.error("Delete failed:", err);
      alert(t("deleteFailed"));
    } finally {
      setDeleting(false);
    }
  }

  if (!open || !file) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 id="delete-modal-title" className="text-lg font-semibold">
            {t("title")}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none"
            aria-label={t("close")}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* File info */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {t("confirmMessage")} <strong>{file.original_filename}</strong>?
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              {t("pageCount", { count: file.page_count })}
            </p>
          </div>

          {/* Preview */}
          <div className="mb-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {t("preview")}
            </div>
            {file && (
              <PdfThumbnail
                file={file}
                className="border rounded overflow-hidden bg-gray-100 dark:bg-gray-700 aspect-[1.4] flex items-center justify-center"
              />
            )}
          </div>

          {/* Warning */}
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded">
            {t("warning")}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 p-4 border-t dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? t("deleting") : t("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}