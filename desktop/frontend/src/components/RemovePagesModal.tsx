"use client";

import React from "react";
import { api } from "../shared/api";
import type { PdfDocument } from "../shared/types";

interface RemovePagesModalProps {
    open: boolean;
    pdfId: string;
    pdfName: string;
    totalPages: number;
    onClose: () => void;
    onSaved: (updatedDoc: PdfDocument) => void;
}

export default function RemovePagesModal({ open, pdfId, pdfName, totalPages, onClose, onSaved }: RemovePagesModalProps) {
    const [pageInput, setPageInput] = React.useState("");
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (open) {
            setPageInput("");
            setError(null);
        }
    }, [open]);

    function parsePages(input: string): number[] {
        const pages = new Set<number>();
        const parts = input.split(",");
        for (const part of parts) {
            const trimmed = part.trim();
            if (!trimmed) continue;
            if (trimmed.includes("-")) {
                const [startStr, endStr] = trimmed.split("-").map((s) => s.trim());
                const start = parseInt(startStr, 10);
                const end = parseInt(endStr, 10);
                if (isNaN(start) || isNaN(end) || start < 1 || end > totalPages || start > end) {
                    return [];
                }
                for (let i = start; i <= end; i++) pages.add(i);
            } else {
                const n = parseInt(trimmed, 10);
                if (isNaN(n) || n < 1 || n > totalPages) return [];
                pages.add(n);
            }
        }
        return [...pages].sort((a, b) => a - b);
    }

    async function handleSave() {
        const pages = parsePages(pageInput);
        if (pages.length === 0) {
            setError(`Inserisci numeri di pagina validi (1-${totalPages}). Es: 1,3,5-8`);
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const updated = await api.removePages(pdfId, pages);
            onSaved(updated);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to remove pages");
        } finally {
            setSaving(false);
        }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#201a15] p-6 shadow-2xl">
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-base font-bold text-white">Remove Pages</h2>
                    <button onClick={onClose} className="h-8 w-8 rounded-lg text-[#9a8d80] hover:bg-white/10 hover:text-white transition-colors" title="Close">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <p className="mb-4 text-xs text-[#8d8175] truncate">{pdfName} ({totalPages} pages)</p>

                <div className="space-y-4">
                    <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#8d8175]">Pages to remove</label>
                        <input
                            value={pageInput}
                            onChange={(e) => setPageInput(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-[#5a4f44] outline-none transition focus:border-[#f7871f]/50"
                            placeholder="e.g. 1,3,5-8"
                        />
                        <p className="mt-1 text-[10px] text-[#7e7267]">Single pages: 1,3,5 &middot; Range: 5-8 &middot; Max: {totalPages}</p>
                    </div>

                    {error && (
                        <p className="text-xs text-red-400">{error}</p>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button onClick={onClose} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[#9a8d80] transition hover:bg-white/5">
                            Cancel
                        </button>
                        <button onClick={handleSave} disabled={saving} className="flex-1 rounded-xl bg-[#f7871f] py-2.5 text-sm font-semibold text-white transition hover:bg-[#ce5a00] disabled:opacity-50">
                            {saving ? "Removing..." : "Remove"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}