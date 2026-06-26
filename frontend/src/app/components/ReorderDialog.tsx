"use client";

import React from "react";
import { useI18n } from "../lib/i18n";
import { api } from "../lib/api";
import { downloadBlob } from "../lib/download";

interface ReorderDialogProps {
  open: boolean;
  onClose: () => void;
  selectedId: string | null;
  selectedName: string;
  totalPages: number;
}

export default function ReorderDialog({ open, onClose, selectedId, selectedName, totalPages }: ReorderDialogProps) {
  const { t } = useI18n();
  const [order, setOrder] = React.useState<number[]>([]);
  const [reordering, setReordering] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setOrder(Array.from({ length: totalPages }, (_, i) => i + 1));
      setError("");
    }
  }, [open, totalPages]);

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

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {selectedName} ({totalPages} {t("reorderDialog.pages")})
        </p>

        {order.length > 0 && (
          <div className="space-y-1 mb-4 max-h-60 overflow-y-auto">
            {order.map((pageNum, pos) => (
              <div
                key={pos}
                className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-700 text-sm"
              >
                <span>
                  {t("reorderDialog.page")} {pageNum}
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
            disabled={!selectedId || !isOrderChanged || reordering}
            onClick={handleReorder}
          >
            {reordering ? t("reorderDialog.reordering") : t("reorderDialog.reorder")}
          </button>
        </div>
      </div>
    </div>
  );
}
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