"use client";

import React from "react";
import { api } from "../shared/api";
import type { PdfDocument } from "../shared/types";

interface MergeModalProps {
    open: boolean;
    pdfId: string;
    pdfName: string;
    onClose: () => void;
    onSaved: (updatedDoc: PdfDocument) => void;
}

export default function MergeModal({ open, pdfId, pdfName, onClose, onSaved }: MergeModalProps) {
    const [docs, setDocs] = React.useState<PdfDocument[]>([]);
    const [selected, setSelected] = React.useState<Set<string>>(new Set());
    const [merging, setMerging] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [outputFilename, setOutputFilename] = React.useState("");

    React.useEffect(() => {
        if (!open) return;
        setSelected(new Set([pdfId]));
        setOutputFilename("");
        setError(null);
        api.listPdfs(0, 100).then((res) => {
            setDocs(res.items || []);
        }).catch(() => { });
    }, [open, pdfId]);

    function toggle(id: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    async function handleMerge() {
        if (selected.size < 2) { setError("Select at least 2 PDFs to merge"); return; }
        setMerging(true); setError(null);
        try {
            const ids = Array.from(selected);
            const result = await api.mergePdfs(ids, outputFilename.trim() || undefined);
            onSaved(result);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to merge PDFs");
        } finally { setMerging(false); }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-lg max-h-[85vh] rounded-2xl border border-white/10 bg-[#201a15] p-6 shadow-2xl flex flex-col">
                <div className="flex items-center justify-between mb-4 shrink-0">
                    <h2 className="text-base font-bold text-white">Merge PDFs</h2>
                    <button onClick={onClose} className="h-8 w-8 rounded-lg text-[#9a8d80] hover:bg-white/10 transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>

                <p className="mb-3 text-xs text-[#8d8175] shrink-0">
                    Select at least 2 PDFs to merge them into a single document.
                </p>

                <div className="flex-1 overflow-y-auto mb-4 space-y-1">
                    {docs.map((doc) => {
                        const isCurrent = doc.id === pdfId;
                        return (
                            <label
                                key={doc.id}
                                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition ${selected.has(doc.id) ? "bg-[#f7871f]/10 ring-1 ring-[#f7871f]/30" : "hover:bg-white/[0.03]"
                                    }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selected.has(doc.id)}
                                    onChange={() => toggle(doc.id)}
                                    className="h-4 w-4 accent-[#f7871f]"
                                />
                                <span className="text-sm text-white truncate flex-1">{doc.original_filename}</span>
                                {isCurrent && (
                                    <span className="text-[10px] text-[#f7871f] font-semibold">Current</span>
                                )}
                            </label>
                        );
                    })}
                    {docs.length === 0 && (
                        <p className="text-xs text-[#6f6358] text-center py-4">No PDFs available</p>
                    )}
                </div>

                <div className="shrink-0 space-y-4">
                    <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#8d8175]">Output filename (optional)</label>
                        <input
                            value={outputFilename}
                            onChange={(e) => setOutputFilename(e.target.value)}
                            placeholder="merged.pdf"
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-[#5a4f44] outline-none transition focus:border-[#f7871f]/50"
                        />
                    </div>

                    {error && <p className="text-xs text-red-400">{error}</p>}

                    <div className="flex gap-3 pt-2">
                        <button onClick={onClose} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[#9a8d80] transition hover:bg-white/5">Cancel</button>
                        <button onClick={handleMerge} disabled={selected.size < 2 || merging} className="flex-1 rounded-xl bg-[#f7871f] py-2.5 text-sm font-semibold text-white transition hover:bg-[#ce5a00] disabled:opacity-50">
                            {merging ? "Merging..." : `Merge (${selected.size})`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}