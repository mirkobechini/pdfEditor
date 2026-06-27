"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { api, PdfDocument } from "../lib/api";
import { downloadBlob } from "../lib/download";

interface MergeDialogProps {
  open: boolean;
  onClose: () => void;
  selectedId: string | null;
  onMergeComplete: (doc: PdfDocument) => void;
}

export default function MergeDialog({ open, onClose, selectedId, onMergeComplete }: MergeDialogProps) {
  const t = useTranslations("mergeDialog");
  const appT = useTranslations("app");
  const [files, setFiles] = React.useState<PdfDocument[]>([]);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [merging, setMerging] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (open) {
      api.listPdfs().then((res) => {
        setFiles(res.items);
        // Pre-select current PDF if applicable
        if (selectedId) {
          setSelected(new Set([selectedId]));
        } else {
          setSelected(new Set());
        }
      });
      setError("");
    }
  }, [open, selectedId]);

  if (!open) return null;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleMerge() {
    if (selected.size < 2) return;
    setMerging(true);
    setError("");
    try {
      const ids = Array.from(selected);
      const result = await api.mergePdfs(ids);
      // Download the resulting merged PDF
      const blob = await api.downloadPdf(result.id);
      downloadBlob(blob, result.original_filename);
      onMergeComplete(result);
      onClose();
    } catch (err) {
      setError(t("failed") + ": " + (err instanceof Error ? err.message : err));
    } finally {
      setMerging(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">{t("title")}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {t("description")}
        </p>

        <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
          {files.map((f) => (
            <label
              key={f.id}
              className={`flex items-center gap-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${selectedId === f.id ? "bg-blue-50 dark:bg-blue-900/20" : ""
                }`}
            >
              <input
                type="checkbox"
                checked={selected.has(f.id)}
                onChange={() => toggle(f.id)}
                className="accent-blue-500"
              />
              <span className="text-sm truncate flex-1">{f.original_filename}</span>
              {selectedId === f.id && (
                <span className="text-xs text-blue-500 font-medium">{appT("currentFile")}</span>
              )}
            </label>
          ))}
        </div>

        {error && <div className="mb-4 p-3 text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded">{error}</div>}

        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 text-sm rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
            onClick={onClose}
          >
            {t("cancel")}
          </button>
          <button
            className="px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
            disabled={selected.size < 2 || merging}
            onClick={handleMerge}
          >
            {merging ? t("merging") : t("merge")}
          </button>
        </div>
      </div>
    </div>
  );
}