"use client";

import React, { useCallback, useMemo } from "react";
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    useSortable,
    rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

function SortablePage({ pageNum, thumb, pos }: { pageNum: number; thumb?: string; pos: number }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: pageNum,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`relative rounded-xl border-2 overflow-hidden transition-all cursor-grab active:cursor-grabbing select-none touch-none ${isDragging
                ? "opacity-50 border-[#f7871f] ring-2 ring-[#f7871f]/30 scale-95 z-50"
                : "border-white/10 hover:border-white/20"
                }`}
        >
            {thumb ? (
                <img src={thumb} alt={`Page ${pageNum}`} className="w-full h-auto block pointer-events-none" />
            ) : (
                <div className="aspect-[3/4] flex items-center justify-center bg-[#1f1914] text-[#7e7267] text-xs">Loading...</div>
            )}
            <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold pointer-events-none">
                {pos + 1}
            </div>
        </div>
    );
}

export default function ReorderPagesModal({ open, pdfId, pdfName, totalPages, pdfUrl, onClose, onSaved }: ReorderPagesModalProps) {
    const [order, setOrder] = React.useState<number[]>([]);
    const [thumbnails, setThumbnails] = React.useState<Record<number, string>>({});
    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [newFilename, setNewFilename] = React.useState(pdfName);
    const [overwrite, setOverwrite] = React.useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    // Load thumbnails when modal opens
    React.useEffect(() => {
        if (!open || !pdfUrl) return;
        setOrder(Array.from({ length: totalPages }, (_, i) => i + 1));
        setError(null);
        setNewFilename(pdfName);
        setOverwrite(false);
        setThumbnails({});
        setLoading(true);

        async function load() {
            const pdfjs = (window as any).pdfjsLib;
            if (!pdfjs) { setLoading(false); return; }
            try {
                const pdf = await pdfjs.getDocument(pdfUrl).promise;
                const results: Record<number, string> = {};
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 0.3 });
                    const canvas = document.createElement("canvas");
                    const dpr = window.devicePixelRatio || 1;
                    canvas.width = viewport.width * dpr;
                    canvas.height = viewport.height * dpr;
                    canvas.style.width = `${viewport.width}px`;
                    canvas.style.height = `${viewport.height}px`;
                    const ctx = canvas.getContext("2d")!;
                    ctx.scale(dpr, dpr);
                    await page.render({ canvasContext: ctx, viewport }).promise;
                    results[i] = canvas.toDataURL("image/png");
                }
                setThumbnails(results);
            } catch { /* ignore */ }
            setLoading(false);
        }
        load();
    }, [open, pdfUrl, totalPages, pdfName]);

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = order.indexOf(active.id as number);
        const newIndex = order.indexOf(over.id as number);
        if (oldIndex === -1 || newIndex === -1) return;

        setOrder((prev) => {
            const n = [...prev];
            const [removed] = n.splice(oldIndex, 1);
            n.splice(newIndex, 0, removed);
            return n;
        });
    }

    async function handleSave() {
        if (order.length < 2) { setError("At least 2 pages required"); return; }
        setSaving(true); setError(null);
        try {
            const updated = await api.reorderPages(pdfId, order, newFilename !== pdfName ? newFilename : undefined, overwrite);
            onSaved(updated);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to reorder pages");
        } finally { setSaving(false); }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl border border-white/10 bg-[#201a15] p-6 shadow-2xl flex flex-col">
                <div className="flex items-center justify-between mb-4 shrink-0">
                    <h2 className="text-base font-bold text-white">Reorder Pages</h2>
                    <button onClick={onClose} className="h-8 w-8 rounded-lg text-[#9a8d80] hover:bg-white/10 transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>

                <p className="mb-4 text-xs text-[#8d8175] shrink-0">{pdfName} ({totalPages} pages)</p>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#f7871f] border-t-transparent" />
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto mb-4">
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={order} strategy={rectSortingStrategy}>
                                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                                    {order.map((pageNum, pos) => (
                                        <SortablePage
                                            key={pageNum}
                                            pageNum={pageNum}
                                            thumb={thumbnails[pageNum]}
                                            pos={pos}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
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