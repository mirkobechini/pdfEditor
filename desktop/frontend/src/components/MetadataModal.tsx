"use client";

import React from "react";
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
    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [fields, setFields] = React.useState<Metadata>({});

    // Load metadata when modal opens
    React.useEffect(() => {
        if (!open) return;
        setLoading(true);
        setError(null);
        api.getMetadata(pdfId)
            .then((meta) => {
                setFields(meta);
                setLoading(false);
            })
            .catch((err) => {
                setError(err instanceof Error ? err.message : "Failed to load metadata");
                setLoading(false);
            });
    }, [open, pdfId]);

    async function handleSave() {
        setSaving(true);
        setError(null);
        try {
            const updated = await api.updateMetadata(pdfId, fields);
            onSaved(updated);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save metadata");
        } finally {
            setSaving(false);
        }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#201a15] p-6 shadow-2xl">
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-base font-bold text-white">Edit Metadata</h2>
                    <button onClick={onClose} className="h-8 w-8 rounded-lg text-[#9a8d80] hover:bg-white/10 hover:text-white transition-colors" title="Close">
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
                        <div>
                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#8d8175]">Title</label>
                            <input
                                value={fields.title ?? ""}
                                onChange={(e) => setFields((f) => ({ ...f, title: e.target.value || null }))}
                                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-[#5a4f44] outline-none transition focus:border-[#f7871f]/50"
                                placeholder="Document title"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#8d8175]">Author</label>
                            <input
                                value={fields.author ?? ""}
                                onChange={(e) => setFields((f) => ({ ...f, author: e.target.value || null }))}
                                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-[#5a4f44] outline-none transition focus:border-[#f7871f]/50"
                                placeholder="Author name"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#8d8175]">Subject</label>
                            <input
                                value={fields.subject ?? ""}
                                onChange={(e) => setFields((f) => ({ ...f, subject: e.target.value || null }))}
                                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-[#5a4f44] outline-none transition focus:border-[#f7871f]/50"
                                placeholder="Subject"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#8d8175]">Keywords</label>
                            <input
                                value={fields.keywords ?? ""}
                                onChange={(e) => setFields((f) => ({ ...f, keywords: e.target.value || null }))}
                                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-[#5a4f44] outline-none transition focus:border-[#f7871f]/50"
                                placeholder="keyword1, keyword2"
                            />
                        </div>

                        {error && (
                            <p className="text-xs text-red-400">{error}</p>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button onClick={onClose} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[#9a8d80] transition hover:bg-white/5">
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={saving} className="flex-1 rounded-xl bg-[#f7871f] py-2.5 text-sm font-semibold text-white transition hover:bg-[#ce5a00] disabled:opacity-50">
                                {saving ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}