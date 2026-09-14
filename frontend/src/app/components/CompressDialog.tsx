"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { api } from "../lib/api";
import { mapError } from "../lib/error-map";

interface CompressDialogProps {
  open: boolean;
  onClose: () => void;
  selectedId: string | null;
  selectedName: string;
  onSuccess?: () => void;
}

export default function CompressDialog({ open, onClose, selectedId, selectedName, onSuccess }: CompressDialogProps) {
  const t = useTranslations("compressDialog");
  const [compressing, setCompressing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [quality, setQuality] = React.useState<"low" | "medium" | "high">("medium");
  const [outputName, setOutputName] = React.useState("");
  const [overwrite, setOverwrite] = React.useState(false);

  // Initialize when dialog opens
  React.useEffect(() => {
    if (open) {
      setError("");
      setQuality("medium");
      setOverwrite(false);
      setOutputName(`compressed_${selectedName}`);
    }
  }, [open, selectedName]);

  if (!open) return null;

  async function handleCompress() {
    if (!selectedId) return;
    setCompressing(true);
    setError("");
    try {
      await api.compressPdf(
        selectedId,
        quality,
        outputName.trim() || undefined,
        overwrite,
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(t("failed") + ": " + mapError(err));
    } finally {
      setCompressing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t("title")}
        </h2>

        <div className="mt-4 space-y-4">
          {/* Quality selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("qualityLabel")}
            </label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as "low" | "medium" | "high")}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            >
              <option value="low">{t("qualityLow")}</option>
              <option value="medium">{t("qualityMedium")}</option>
              <option value="high">{t("qualityHigh")}</option>
            </select>
          </div>

          {/* Output filename */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("outputNameLabel")}
            </label>
            <input
              type="text"
              value={outputName}
              onChange={(e) => setOutputName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            />
          </div>

          {/* Overwrite toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
              className="rounded border-gray-300"
            />
            {t("overwriteLabel")}
          </label>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleCompress}
            disabled={compressing}
            className="flex-1 rounded-xl bg-[#f7871f] py-2.5 text-sm font-semibold text-white hover:bg-[#ce5a00]"
          >
            {compressing ? t("compressing") : t("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}