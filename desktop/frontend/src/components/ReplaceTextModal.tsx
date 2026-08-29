"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { api } from "../shared/api";
import type { PdfDocument } from "../shared/types";

interface ReplaceTextModalProps {
    open: boolean;
    onClose: () => void;
    pdfId: string | null;
    onSuccess?: (doc: PdfDocument) => void;
}

export default function ReplaceTextModal({ open, onClose, pdfId, onSuccess }: ReplaceTextModalProps) {
    const t = useTranslations("replaceTextDialog");
    const [search, setSearch] = React.useState("");
    const [replaceWith, setReplaceWith] = React.useState("");
    const [replaceAll, setReplaceAll] = React.useState(true);
    const [replacing, setReplacing] = React.useState(false);
    const [error, setError] = React.useState("");
    const [outputName, setOutputName] = React.useState("");

    async function handleReplace() {
        if (!pdfId || !search.trim()) return;
        setReplacing(true);
        setError("");
        try {
            const occurrence = replaceAll ? undefined : 1;
            const result = await api.replaceText(pdfId, search, replaceWith, occurrence, outputName.trim() || undefined);
            setSearch("");
            setReplaceWith("");
            onClose();
            onSuccess?.(result);
        } catch (err) {
            setError(t("replaceFailed") + ": " + (err instanceof Error ? err.message : String(err)));
        } finally {
            setReplacing(false);
        }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#201a15] p-6 shadow-2xl">
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-base font-bold text-white">{t("title")}</h2>
                    <button onClick={onClose} className="h-8 w-8 rounded-lg text-[#9a8d80] hover:bg-white/10 hover:text-white transition-colors" title={t("cancel")}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#8d8175]">{t("searchLabel")}</label>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t("searchPlaceholder")}
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-[#5a4f44] outline-none transition focus:border-[#f7871f]/50"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#8d8175]">{t("replaceLabel")}</label>
                        <input
                            type="text"
                            value={replaceWith}
                            onChange={(e) => setReplaceWith(e.target.value)}
                            placeholder={t("replacePlaceholder")}
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-[#5a4f44] outline-none transition focus:border-[#f7871f]/50"
                        />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={replaceAll}
                            onChange={(e) => setReplaceAll(e.target.checked)}
                            className="w-4 h-4 rounded border border-white/10 bg-white/[0.03]"
                        />
                        <span className="text-sm text-[#c4b9ad]">{t("replaceAllLabel")}</span>
                    </label>

                    {error && (
                        <div className="p-3 text-sm text-red-400 bg-red-900/20 border border-red-800/30 rounded-xl">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#8d8175]">{t("outputName")}</label>
                        <input
                            type="text"
                            value={outputName}
                            onChange={(e) => setOutputName(e.target.value)}
                            placeholder="replaced.pdf"
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-[#5a4f44] outline-none transition focus:border-[#f7871f]/50"
                        />
                        <p className="text-xs text-[#5a4f44] mt-1">{t("outputNameHint")}</p>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[#9a8d80] hover:bg-white/5 transition-colors"
                            onClick={onClose}
                        >
                            {t("cancel")}
                        </button>
                        <button
                            className="flex-1 rounded-xl bg-[#f7871f] py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-colors"
                            onClick={handleReplace}
                            disabled={replacing || !search.trim()}
                        >
                            {replacing ? t("replacing") : t("replace")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
