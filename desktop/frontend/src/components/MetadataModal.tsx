"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { api } from "../shared/api";
import type { Metadata, PdfDocument } from "../shared/types";

interface MetadataModalProps {
    open: boolean;
    pdfId: string;
    pdfName: string;
    onClose: () => void;
    onSaved: (updatedDoc: PdfDocument) => void;
}

export default function MetadataModal({ open, pdfId, pdfName, onClose, onSaved }: MetadataModalProps) {
    const tm = useTranslations("metadataModal");
    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [fields, setFields] = React.useState<Metadata>({});
    const [newFilename, setNewFilename] = React.useState(pdfName);
    const [overwrite, setOverwrite] = React.useState(false);

    // Load metadata when modal opens
    React.useEffect(() => {
        if (!open) return;
        setLoading(true);
        setError(null);
        setNewFilename(pdfName);
        setOverwrite(false);
        api.getMetadata(pdfId)
            .then((meta) => {
                setFields(meta);
                setLoading(false);
            })
            .catch((err) => {
                setError(err instanceof Error ? err.message : tm("loadError"));
                setLoading(false);
            });
    }, [open, pdfId, pdfName]);

    async function handleSave() {
        setSaving(true);
        setError(null);
        try {
            const payload = {
                ...fields,
                new_filename: newFilename !== pdfName ? newFilename : undefined,
                overwrite,
            };
            const updated = await api.updateMetadata(pdfId, payload);
            onSaved(updated);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : tm("saveError"));
        } finally {
            setSaving(false);
        }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#201a15] p-6 shadow-2xl">
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-base font-bold text-white">{tm("modalTitle")}</h2>
                    <button onClick={onClose} className="h-8 w-8 rounded-lg text-[#9a8d80] hover:bg-white/10 hover:text-white transition-colors" title={tm("close")}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#f7871f] border-t-transparent" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Filename */}
                        <div>
                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#8d8175]">{tm("filename")}</label>
                            <input
                                value={newFilename}
                                onChange={(e) => setNewFilename(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-[#5a4f44] outline-none transition focus:border-[#f7871f]/50"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#8d8175]">{tm("fieldTitle")}</label>
                            <input
                                value={fields.title ?? ""}
                                onChange={(e) => setFields((f) => ({ ...f, title: e.target.value || null }))}
                                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-[#5a4f44] outline-none transition focus:border-[#f7871f]/50"
                                placeholder={tm("titlePlaceholder")}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#8d8175]">{tm("author")}</label>
                            <input
                                value={fields.author ?? ""}
                                onChange={(e) => setFields((f) => ({ ...f, author: e.target.value || null }))}
                                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-[#5a4f44] outline-none transition focus:border-[#f7871f]/50"
                                placeholder={tm("authorPlaceholder")}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#8d8175]">{tm("subject")}</label>
                            <input
                                value={fields.subject ?? ""}
                                onChange={(e) => setFields((f) => ({ ...f, subject: e.target.value || null }))}
                                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-[#5a4f44] outline-none transition focus:border-[#f7871f]/50"
                                placeholder={tm("subjectPlaceholder")}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#8d8175]">{tm("keywords")}</label>
                            <input
                                value={fields.keywords ?? ""}
                                onChange={(e) => setFields((f) => ({ ...f, keywords: e.target.value || null }))}
                                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-[#5a4f44] outline-none transition focus:border-[#f7871f]/50"
                                placeholder={tm("keywordsPlaceholder")}
                            />
                        </div>

                        {/* Save mode */}
                        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                            <input
                                type="checkbox"
                                id="overwrite"
                                checked={overwrite}
                                onChange={(e) => setOverwrite(e.target.checked)}
                                className="h-4 w-4 accent-[#f7871f]"
                            />
                            <label htmlFor="overwrite" className="text-xs text-[#c4b8ab] cursor-pointer select-none">
                                {tm("overwrite")}
                            </label>
                        </div>

                        {error && (
                            <p className="text-xs text-red-400">{error}</p>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button onClick={onClose} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[#9a8d80] transition hover:bg-white/5">
                                {tm("cancel")}
                            </button>
                            <button onClick={handleSave} disabled={saving} className="flex-1 rounded-xl bg-[#f7871f] py-2.5 text-sm font-semibold text-white transition hover:bg-[#ce5a00] disabled:opacity-50">
                                {saving ? tm("saving") : tm("save")}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}