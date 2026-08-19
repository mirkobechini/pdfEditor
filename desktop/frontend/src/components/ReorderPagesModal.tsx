"use client";

import React, { useCallback } from "react";
import { api } from "../shared/api";
import type { PdfDocument } from "../shared/types";

interface ReorderPagesModalProps {
    open: boolean;
    pdfId: string;
    pdfName: string;
    totalPages: number;
    pdfUrl: string | null;
    onClose: () => void;
    onSaved: (updatedDoc: PdfDocument) => void;
}

function PageThumb({ pdfUrl, pageNum, index, onMoveUp, onMoveDown, isFirst, isLast }: {
    pdfUrl: string;
    pageNum: number;
    index: number;
    onMoveUp: (idx: number) => void;
    onMoveDown: (idx: number) => void;
    isFirst: boolean;
    isLast: boolean;
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
                const viewport = page.getViewport({ scale: 0.25 });
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
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#1f1914] p-2">
            <div className="flex flex-col gap-1">
                <button onClick={() => onMoveUp(index)} disabled={isFirst} className="h-5 w-5 rounded text-[#7e7267] hover:text-white disabled:opacity-20 transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto"><path d="M18 15l-6-6-6 6" /></svg>
                </button>
                <span className="text-[10px] text-center text-[#7e7267] font-mono">{index + 1}</span>
                <button onClick={() => onMoveDown(index)} disabled={isLast} className="h-5 w-5 rounded text-[#7e7267] hover:text-white disabled:opacity-20 transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto"><path d="M6 9l6 6 6-6" /></svg>
                </button>
            </div>
            <div className="relative rounded-lg overflow-hidden w-20">
                <canvas ref={canvasRef} className="block w-full" />
                {!loaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#1f1914]">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#f7871f] border-t-transparent" />
                    </div>
                )}
            </div>
            <span className="text-[11px] text-[#c4b8ab] font-mono shrink-0">P.{pageNum}</span>
        </div>
    );
}

export default function ReorderPagesModal({ open, pdfId, pdfName, totalPages, pdfUrl, onClose, onSaved }: ReorderPagesModalProps) {
    const [order, setOrder] = React.useState<number[]>([]);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [newFilename, setNewFilename] = React.useState(pdfName);
    const [overwrite, setOverwrite] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            setOrder(Array.from({ length: totalPages }, (_, i) => i + 1));
            setError(null);
            setNewFilename(pdfName);
            setOverwrite(false);
        }
    }, [open, totalPages, pdfName]);

    const moveUp = useCallback((idx: number) => {
        if (idx <= 0) return;
        setOrder((prev) => {
            const next = [...prev];
            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
            return next;
        });
    }, []);

    const moveDown = useCallback((idx: number) => {
        setOrder((prev) => {
            if (idx >= prev.length - 1) return prev;
            const next = [...prev];
            [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
            return next;
        });
    }, []);

    async function handleSave() {
        if (order.length < 2) {
            setError("At least 2 pages required");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const updated = await api.reorderPages(pdfId, order, newFilename !== pdfName ? newFilename : undefined);
            onSaved(updated);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to reorder pages");
        } finally {
            setSaving(false);
        }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-lg max-h-[85vh] rounded-2xl border border-white/10 bg-[#201a15] p-6 shadow-2xl flex flex-col">
                <div className="flex items-center justify-between mb-4 shrink-0">
                    <h2 className="text-base font-bold text-white">Reorder Pages</h2>
                    <button onClick={onClose} className="h-8 w-8 rounded-lg text-[#9a8d80] hover:bg-white/10 transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>

                <p className="mb-4 text-xs text-[#8d8175] shrink-0">{pdfName} ({totalPages} pages)</p>

                {pdfUrl && (
                    <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1">
                        {order.map((pageNum, idx) => (
                            <PageThumb
                                key={`${pageNum}-${idx}`}
                                pdfUrl={pdfUrl}
                                pageNum={pageNum}
                                index={idx}
                                onMoveUp={moveUp}
                                onMoveDown={moveDown}
                                isFirst={idx === 0}
                                isLast={idx === order.length - 1}
                            />
                        ))}
                    </div>
                )}

                <div className="shrink-0 space-y-4">
                    <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#8d8175]">Filename</label>
                        <input value={newFilename} onChange={(e) => setNewFilename(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-[#5a4f44] outline-none transition focus:border-[#f7871f]/50" />
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                        <input type="checkbox" id="reorder-overwrite" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} className="h-4 w-4 accent-[#f7871f]" />
                        <label htmlFor="reorder-overwrite" className="text-xs text-[#c4b8ab] cursor-pointer select-none">Overwrite existing file (instead of creating a copy)</label>
                    </div>

                    {error && <p className="text-xs text-red-400">{error}</p>}

                    <div className="flex gap-3 pt-2">
                        <button onClick={onClose} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[#9a8d80] transition hover:bg-white/5">Cancel</button>
                        <button onClick={handleSave} disabled={saving} className="flex-1 rounded-xl bg-[#f7871f] py-2.5 text-sm font-semibold text-white transition hover:bg-[#ce5a00] disabled:opacity-50">
                            {saving ? "Reordering..." : "Reorder"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}