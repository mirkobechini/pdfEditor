"use client";

import React from "react";
import { api } from "../shared/api";
import type { PdfDocument } from "../shared/types";

interface RemovePagesModalProps {
    open: boolean;
    pdfId: string;
    pdfName: string;
    totalPages: number;
    pdfUrl: string | null;
    onClose: () => void;
    onSaved: (updatedDoc: PdfDocument) => void;
}

function PageThumbnail({ pdfUrl, pageNum, selected, onToggle }: {
    pdfUrl: string;
    pageNum: number;
    selected: boolean;
    onToggle: (page: number) => void;
}) {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const [loaded, setLoaded] = React.useState(false);

    React.useEffect(() => {
        if (!canvasRef.current || !pdfUrl) return;
        let cancelled = false;

        async function render() {
            const pdfjs = (window as any).pdfjsLib;
            if (!pdfjs) return;
            try {
                const pdf = await pdfjs.getDocument(pdfUrl).promise;
                if (cancelled) return;
                const page = await pdf.getPage(pageNum);
                if (cancelled) return;
                const viewport = page.getViewport({ scale: 0.3 });
                const canvas = canvasRef.current!;
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext("2d")!;
                await page.render({ canvasContext: ctx, viewport }).promise;
                if (!cancelled) setLoaded(true);
            } catch { /* ignore */ }
        }
        render();
        return () => { cancelled = true; };
    }, [pdfUrl, pageNum]);

    return (
        <button
            onClick={() => onToggle(pageNum)}
            className={`relative rounded-xl border-2 overflow-hidden transition-all cursor-pointer ${selected ? "border-[#f7871f] ring-2 ring-[#f7871f]/30" : "border-white/10 hover:border-white/20"}`}
        >
            <canvas ref={canvasRef} className="block w-full" />
            {!loaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#1f1914]">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#f7871f] border-t-transparent" />
                </div>
            )}
            <div className="absolute top-1 left-1 flex items-center gap-1">
                <div className={`h-4 w-4 rounded border flex items-center justify-center ${selected ? "bg-[#f7871f] border-[#f7871f]" : "bg-white/10 border-white/30"}`}>
                    {selected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                </div>
                <span className="text-[10px] text-white font-semibold drop-shadow-md">{pageNum}</span>
            </div>
        </button>
    );
}

export default function RemovePagesModal({ open, pdfId, pdfName, totalPages, pdfUrl, onClose, onSaved }: RemovePagesModalProps) {
    const [pageInput, setPageInput] = React.useState("");
    const [selectedPages, setSelectedPages] = React.useState<Set<number>>(new Set());
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [newFilename, setNewFilename] = React.useState(pdfName);
    const [overwrite, setOverwrite] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            setPageInput("");
            setSelectedPages(new Set());
            setError(null);
            setNewFilename(pdfName);
            setOverwrite(false);
        }
    }, [open, pdfName]);

    function togglePage(page: number) {
        setSelectedPages((prev) => {
            const next = new Set(prev);
            if (next.has(page)) next.delete(page);
            else next.add(page);
            return next;
        });
    }

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
                if (isNaN(start) || isNaN(end) || start < 1 || end > totalPages || start > end) return [];
                for (let i = start; i <= end; i++) pages.add(i);
            } else {
                const n = parseInt(trimmed, 10);
                if (isNaN(n) || n < 1 || n > totalPages) return [];
                pages.add(n);
            }
        }
        return [...pages].sort((a, b) => a - b);
    }

    function getPagesToRemove(): number[] {
        const fromInput = pageInput.trim() ? parsePages(pageInput) : [];
        const fromCheckboxes = [...selectedPages];
        const combined = new Set([...fromInput, ...fromCheckboxes]);
        return [...combined].sort((a, b) => a - b);
    }

    async function handleSave() {
        const pages = getPagesToRemove();
        if (pages.length === 0) {
            setError("Seleziona o inserisci almeno una pagina da rimuovere.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const updated = await api.removePages(pdfId, pages, newFilename !== pdfName ? newFilename : undefined, overwrite);
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
            <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl border border-white/10 bg-[#201a15] p-6 shadow-2xl flex flex-col">
                <div className="flex items-center justify-between mb-4 shrink-0">
                    <h2 className="text-base font-bold text-white">Remove Pages</h2>
                    <button onClick={onClose} className="h-8 w-8 rounded-lg text-[#9a8d80] hover:bg-white/10 transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>

                <p className="mb-4 text-xs text-[#8d8175] shrink-0">{pdfName} ({totalPages} pages)</p>

                {/* Page thumbnails grid */}
                {pdfUrl && (
                    <div className="flex-1 overflow-y-auto mb-4">
                        <div className="grid grid-cols-6 gap-2">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                                <PageThumbnail
                                    key={pageNum}
                                    pdfUrl={pdfUrl}
                                    pageNum={pageNum}
                                    selected={selectedPages.has(pageNum)}
                                    onToggle={togglePage}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Manual input */}
                <div className="shrink-0 space-y-4">
                    <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#8d8175]">Or enter page numbers manually</label>
                        <input
                            value={pageInput}
                            onChange={(e) => setPageInput(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-[#5a4f44] outline-none transition focus:border-[#f7871f]/50"
                            placeholder="e.g. 1,3,5-8"
                        />
                        <p className="mt-1 text-[10px] text-[#7e7267]">Single: 1,3,5 &middot; Range: 5-8 &middot; Max: {totalPages}</p>
                    </div>

                    {/* Filename + overwrite */}
                    <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#8d8175]">Filename</label>
                        <input
                            value={newFilename}
                            onChange={(e) => setNewFilename(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-[#5a4f44] outline-none transition focus:border-[#f7871f]/50"
                        />
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                        <input type="checkbox" id="remove-overwrite" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} className="h-4 w-4 accent-[#f7871f]" />
                        <label htmlFor="remove-overwrite" className="text-xs text-[#c4b8ab] cursor-pointer select-none">Overwrite existing file (instead of creating a copy)</label>
                    </div>

                    {error && <p className="text-xs text-red-400">{error}</p>}

                    <div className="flex gap-3 pt-2">
                        <button onClick={onClose} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[#9a8d80] transition hover:bg-white/5">Cancel</button>
                        <button onClick={handleSave} disabled={saving} className="flex-1 rounded-xl bg-[#f7871f] py-2.5 text-sm font-semibold text-white transition hover:bg-[#ce5a00] disabled:opacity-50">
                            {saving ? "Removing..." : `Remove ${getPagesToRemove().length} page${getPagesToRemove().length !== 1 ? "s" : ""}`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}