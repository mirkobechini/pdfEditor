"use client";

import React from "react";
import { api } from "../shared/api";
import type { PdfDocument } from "../shared/types";

interface SplitPagesModalProps {
    open: boolean;
    pdfId: string;
    pdfName: string;
    totalPages: number;
    pdfUrl: string | null;
    onClose: () => void;
    onSaved: (docs: PdfDocument[]) => void;
}

function PageThumbnail({ pdfUrl, pageNum, isSplitPoint, onSelect }: {
    pdfUrl: string;
    pageNum: number;
    isSplitPoint: boolean;
    onSelect: (page: number) => void;
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
            onClick={() => onSelect(pageNum)}
            className={`relative rounded-xl border-2 overflow-hidden transition-all cursor-pointer ${isSplitPoint ? "border-[#f7871f] ring-2 ring-[#f7871f]/30" : "border-white/10 hover:border-white/20"}`}
        >
            <canvas ref={canvasRef} className="block w-full" />
            {!loaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#1f1914]">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#f7871f] border-t-transparent" />
                </div>
            )}
            <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">
                {pageNum}
            </div>
            {isSplitPoint && (
                <div className="absolute bottom-1 right-1 bg-[#f7871f] text-white text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                    Split here
                </div>
            )}
        </button>
    );
}

export default function SplitPagesModal({ open, pdfId, pdfName, totalPages, pdfUrl, onClose, onSaved }: SplitPagesModalProps) {
    const [splitPage, setSplitPage] = React.useState<number | null>(null);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [filename1, setFilename1] = React.useState("");
    const [filename2, setFilename2] = React.useState("");

    React.useEffect(() => {
        if (open) {
            setSplitPage(null);
            setError(null);
            const base = pdfName.replace(/\.pdf$/i, "");
            setFilename1(`${base}_part1`);
            setFilename2(`${base}_part2`);
        }
    }, [open, pdfName]);

    async function handleSave() {
        if (!splitPage) { setError("Select the page where to split"); return; }
        if (splitPage >= totalPages) { setError("Cannot split at the last page — at least 1 page must remain in part 2"); return; }
        if (!filename1.trim() || !filename2.trim()) { setError("Both filenames are required"); return; }

        setSaving(true); setError(null);
        try {
            const ranges = [`1-${splitPage}`, `${splitPage + 1}-${totalPages}`];
            const result = await api.splitPdf(pdfId, "range", ranges, undefined, [filename1.trim(), filename2.trim()]);
            onSaved(result.items);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to split PDF");
        } finally { setSaving(false); }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl border border-white/10 bg-[#201a15] p-6 shadow-2xl flex flex-col">
                <div className="flex items-center justify-between mb-4 shrink-0">
                    <h2 className="text-base font-bold text-white">Split PDF</h2>
                    <button onClick={onClose} className="h-8 w-8 rounded-lg text-[#9a8d80] hover:bg-white/10 transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>

                <p className="mb-4 text-xs text-[#8d8175] shrink-0">{pdfName} ({totalPages} pages)</p>

                <p className="mb-3 text-[11px] text-[#6f6358] shrink-0">
                    Click a page to set the split point. The PDF will be divided into two parts.
                </p>

                <div className="flex-1 overflow-y-auto mb-4">
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                            <PageThumbnail
                                key={pageNum}
                                pdfUrl={pdfUrl!}
                                pageNum={pageNum}
                                isSplitPoint={splitPage === pageNum}
                                onSelect={(p) => setSplitPage(splitPage === p ? null : p)}
                            />
                        ))}
                    </div>
                </div>

                {splitPage && (
                    <div className="shrink-0 space-y-4 border-t border-white/10 pt-4">
                        <div className="flex items-center gap-3 text-xs text-[#8d8175]">
                            <span className="rounded-full bg-[#f7871f]/20 px-2.5 py-1 text-[#f7871f] font-semibold">
                                Pages 1–{splitPage}
                            </span>
                            <span className="text-[#5a4f44]">→</span>
                            <span className="rounded-full bg-white/10 px-2.5 py-1 text-white font-semibold">
                                Pages {splitPage + 1}–{totalPages}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#8d8175]">Part 1 filename</label>
                                <input value={filename1} onChange={(e) => setFilename1(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-[#5a4f44] outline-none transition focus:border-[#f7871f]/50" />
                            </div>
                            <div>
                                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#8d8175]">Part 2 filename</label>
                                <input value={filename2} onChange={(e) => setFilename2(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-[#5a4f44] outline-none transition focus:border-[#f7871f]/50" />
                            </div>
                        </div>

                        {error && <p className="text-xs text-red-400">{error}</p>}

                        <div className="flex gap-3 pt-2">
                            <button onClick={onClose} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[#9a8d80] transition hover:bg-white/5">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="flex-1 rounded-xl bg-[#f7871f] py-2.5 text-sm font-semibold text-white transition hover:bg-[#ce5a00] disabled:opacity-50">
                                {saving ? "Splitting..." : "Split"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}