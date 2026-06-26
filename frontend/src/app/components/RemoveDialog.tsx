"use client";

import React from "react";
import { useI18n } from "../lib/i18n";
import { api } from "../lib/api";

interface RemoveDialogProps {
  open: boolean;
  onClose: () => void;
  selectedId: string | null;
  selectedName: string;
  totalPages: number;
}

export default function RemoveDialog({ open, onClose, selectedId, selectedName, totalPages }: RemoveDialogProps) {
  const { t } = useI18n();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [toRemove, setToRemove] = React.useState<Set<number>>(new Set());
  const [removing, setRemoving] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setToRemove(new Set());
      setConfirmOpen(false);
      setError("");
    }
  }, [open]);

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
      // Trigger download
      const blob = await api.downloadPdf(result.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trimmed_${selectedName}`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      setError(t("removeDialog.failed") + ": " + err);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">{t("removeDialog.title")}</h2>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {selectedName} ({totalPages} {t("removeDialog.pages")})
        </p>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          {t("removeDialog.pagesRemaining")}: {remaining}
        </p>

        <div className="grid grid-cols-5 gap-2 mb-4 max-h-60 overflow-y-auto">
          {Array.from({ length: totalPages }, (_, i) => i).map((idx) => {
            const selected = toRemove.has(idx);
            return (
              <button
                key={idx}
                onClick={() => togglePage(idx)}
                className={`aspect-square rounded text-sm font-medium transition-colors ${
                  selected
                    ? "bg-red-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        {confirmOpen ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-700 dark:text-red-300 mb-3 font-medium">
              {t("removeDialog.confirmMessage")}
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1.5 text-xs rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                onClick={() => setConfirmOpen(false)}
                disabled={removing}
              >
                {t("removeDialog.cancel")}
              </button>
              <button
                className="px-3 py-1.5 text-xs rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                disabled={removing}
                onClick={handleRemove}
              >
                {removing ? t("removeDialog.removing") : t("removeDialog.confirmDelete")}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <button
              className="px-4 py-2 text-sm rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
              onClick={onClose}
            >
              {t("removeDialog.cancel")}
            </button>
            <button
              className="px-4 py-2 text-sm rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
              disabled={!selectedId || !canConfirm}
              onClick={() => setConfirmOpen(true)}
            >
              {t("removeDialog.remove")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
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