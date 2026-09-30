// Pannello destro dell'editor desktop — estratta da app/app/page.tsx (issue #881, T5).
// Mostra i metadati del documento selezionato e le "Fast Actions" (merge/split/lock/ocr).

import type { PdfDocument } from "../../shared/types";
import { formatFileSize } from "../../lib/editor-utils";

export type EditorRightPanelProps = {
    te: (k: string, values?: Record<string, string | number | Date>) => string;
    selectedDoc: PdfDocument | null;
    locked: boolean; // selectedDoc?.is_password_protected
    onMerge: () => void;
    onSplit: () => void;
    onLock: () => void;
    onOcr: () => void;
};

export function EditorRightPanel(props: EditorRightPanelProps) {
    const { te, selectedDoc, locked, onMerge, onSplit, onLock, onOcr } = props;
    const selected = !!selectedDoc;

    return (
        <aside className="flex flex-col bg-[#201a15] p-5">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest">{te("pageMetadata")}</h3>
            <div className="mt-4 space-y-3 border-b border-white/10 pb-5">
                {selectedDoc ? (
                    <>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-[#948779]">{te("filename")}</span>
                            <span className="text-xs font-semibold text-white text-right truncate max-w-[140px]">{selectedDoc.original_filename}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-[#948779]">{te("size")}</span>
                            <span className="text-xs font-semibold text-white">{formatFileSize(selectedDoc.file_size, te)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-[#948779]">{te("pages")}</span>
                            <span className="text-xs font-semibold text-white">{selectedDoc.page_count}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-[#948779]">{te("created")}</span>
                            <span className="text-xs font-semibold text-white">{selectedDoc.pdf_creation_date ? new Date(selectedDoc.pdf_creation_date).toLocaleDateString() : new Date(selectedDoc.created_at).toLocaleDateString()}</span>
                        </div>
                    </>
                ) : (
                    <p className="text-xs text-[#7e7267]">{te("noPdfSelected")}</p>
                )}
            </div>

            <h4 className="mt-6 mb-4 text-xs font-bold uppercase tracking-widest">Fast Actions</h4>
            <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                    onClick={onMerge}
                    disabled={!selected}
                    className="rounded-[14px] border border-white/10 bg-white/[0.03] p-3 text-center transition-all hover:border-[#f7871f]/40 hover:bg-[#2a231d] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#8f8377]">MERGE</p>
                </button>
                <button
                    onClick={onSplit}
                    disabled={!selected}
                    className="rounded-[14px] border border-white/10 bg-white/[0.03] p-3 text-center transition-all hover:border-[#f7871f]/40 hover:bg-[#2a231d] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#8f8377]">SPLIT</p>
                </button>
                <button
                    onClick={onLock}
                    disabled={!selected}
                    className="rounded-[14px] border border-white/10 bg-white/[0.03] p-3 text-center transition-all hover:border-[#f7871f]/40 hover:bg-[#2a231d] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#8f8377]">
                        {locked ? "UNLOCK" : "LOCK"}
                    </p>
                </button>
                <button
                    onClick={onOcr}
                    disabled={!selected}
                    data-testid="fast-action-ocr"
                    className="rounded-[14px] border border-white/10 bg-white/[0.03] p-3 text-center transition-all hover:border-[#f7871f]/40 hover:bg-[#2a231d] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#8f8377]">OCR</p>
                </button>
            </div>
        </aside>
    );
}