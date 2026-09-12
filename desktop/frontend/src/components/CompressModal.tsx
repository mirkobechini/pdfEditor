"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { api } from "../shared/api";
import type { PdfDocument } from "../shared/types";
import { useApiError } from "../hooks/useApiError";

interface CompressModalProps {
    open: boolean;
    pdfId: string;
    pdfName: string;
    onClose: () => void;
    onSaved: (doc: PdfDocument) => void;
}

export default function CompressModal({ open, pdfId, pdfName, onClose, onSaved }: CompressModalProps) {
    const t = useTranslations("compressModal");
    const apiError = useApiError();
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [quality, setQuality] = React.useState<"low" | "medium" | "high">("medium");
    const [outputName, setOutputName] = React.useState("");
    const [overwrite, setOverwrite] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            setError(null);
            setQuality("medium");
            setOverwrite(false);
            setOutputName(`compressed_${pdfName}`);
        }
    }, [open, pdfName]);

    async function handleSave() {
        setSaving(true); setError(null);
        try {
            const doc = await api.compressPdf(
                pdfId,
                quality,
                outputName.trim() || undefined,
                overwrite,
            );
            onSaved(doc);
            onClose();
        } catch (err) {
            setError(apiError(err));
        } finally { setSaving(false); }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#201a15] p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-white">{t("title")}</h2>
                    <button onClick={onClose} className="h-8 w-8 rounded-lg text-[#9a8d80] hover:bg-white/10 transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>

                <p className="mb-4 text-xs text-[#8d8175]">{pdfName}</p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-[#8d8175] mb-1">{t("qualityLabel")}</label>
                        <select
                            value={quality}
                            onChange={(e) => setQuality(e.target.value as "low" | "medium" | "high")}
                            className="w-full rounded-lg border border-white/10 bg-[#2a241d] px-3 py-2 text-sm text-white"
                        >
                            <option value="low">{t("qualityLow")}</option>
                            <option value="medium">{t("qualityMedium")}</option>
                            <option value="high">{t("qualityHigh")}</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs text-[#8d8175] mb-1">{t("outputNameLabel")}</label>
                        <input
                            type="text"
                            value={outputName}
                            onChange={(e) => setOutputName(e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-[#2a241d] px-3 py-2 text-sm text-white"
                        />
                    </div>

                    <label className="flex items-center gap-2 text-xs text-[#8d8175]">
                        <input
                            type="checkbox"
                            checked={overwrite}
                            onChange={(e) => setOverwrite(e.target.checked)}
                            className="rounded border-white/10"
                        />
                        {t("overwriteLabel")}
                    </label>

                    {error && <p className="text-xs text-red-400">{error}</p>}
                </div>

                <div className="mt-6 flex gap-3">
                    <button onClick={onClose} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[#9a8d80] hover:bg-white/5">
                        {t("cancel")}
                    </button>
                    <button onClick={handleSave} disabled={saving} className="flex-1 rounded-xl bg-[#f7871f] py-2.5 text-sm font-semibold text-white hover:bg-[#ce5a00]">
                        {saving ? t("compressing") : t("confirm")}
                    </button>
                </div>
            </div>
        </div>
    );
}