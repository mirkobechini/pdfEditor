// Viewer centrale dell'editor desktop — estratta da app/app/page.tsx (issue #881, T7).
// Presentazionale: toolbar + area di anteprima PDF (drag overlay, filename,
// PdfViewer, overlay "PDF protetto", stato vuoto). Lo stato resta nel padre.

import { type RefObject } from "react";
import PdfViewer from "../../components/PdfViewer";
import { EditorToolbar, type OpenMenu } from "./EditorToolbar";
import type { PdfDocument } from "../../shared/types";

export type EditorViewerProps = {
    te: (k: string, values?: Record<string, string | number | Date>) => string;
    selectedDoc: PdfDocument | null;
    dragOver: boolean;
    pdfUrl: string | null;
    currentPage: number;
    totalPages: number;
    zoom: number;
    openMenu: OpenMenu;
    organizeRef: RefObject<HTMLDivElement | null>;
    convertRef: RefObject<HTMLDivElement | null>;
    annotateMenuRef: RefObject<HTMLDivElement | null>;
    onDownload: () => void;
    onPrint: () => void;
    onPageChange: (p: number) => void;
    onTotalPagesChange: (t: number) => void;
    onZoomChange: (z: number) => void;
    onToggleMenu: (m: Exclude<OpenMenu, null>) => void;
    onMerge: () => void;
    onSplit: () => void;
    onReorder: () => void;
    onRemovePages: () => void;
    onCompress: () => void;
    onImportExport: () => void;
    onReplaceText: () => void;
    onMetadata: () => void;
    onSign: () => void;
    onOcr: () => void;
    onAnnotate: () => void;
    onShare: () => void;
    onUnlock: () => void;
};

export function EditorViewer(props: EditorViewerProps) {
    const {
        te, selectedDoc, dragOver, pdfUrl, currentPage, totalPages, zoom,
        openMenu, organizeRef, convertRef, annotateMenuRef,
        onDownload, onPrint, onPageChange, onTotalPagesChange, onZoomChange, onToggleMenu,
        onMerge, onSplit, onReorder, onRemovePages,
        onCompress, onImportExport, onReplaceText, onMetadata,
        onSign, onOcr, onAnnotate, onShare, onUnlock,
    } = props;

    return (
        <main className="flex flex-col border-r border-white/10 bg-[#13100d] min-h-0">
            <EditorToolbar
                te={te}
                selected={!!selectedDoc}
                totalPages={totalPages}
                currentPage={currentPage}
                zoom={zoom}
                openMenu={openMenu}
                organizeRef={organizeRef}
                convertRef={convertRef}
                annotateMenuRef={annotateMenuRef}
                onDownload={onDownload}
                onPrint={onPrint}
                onPageChange={onPageChange}
                onZoomChange={onZoomChange}
                onToggleMenu={onToggleMenu}
                onMerge={onMerge}
                onSplit={onSplit}
                onReorder={onReorder}
                onRemovePages={onRemovePages}
                onCompress={onCompress}
                onImportExport={onImportExport}
                onReplaceText={onReplaceText}
                onMetadata={onMetadata}
                onSign={onSign}
                onOcr={onOcr}
                onAnnotate={onAnnotate}
                onShare={onShare}
            />

            <div className="flex-1 bg-black p-6 overflow-hidden relative">
                {dragOver && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#f7871f]/10 border-2 border-dashed border-[#f7871f]/50 rounded-2xl m-6 pointer-events-none">
                        <p className="text-lg font-semibold text-[#f7871f]">{te("dropToUpload")}</p>
                    </div>
                )}
                <div className="relative h-full border border-white/6 bg-[#0f0d0b]">
                    <div className="absolute left-4 top-3 z-10 font-mono text-[10px] text-[#d8d8d8]">
                        {selectedDoc?.original_filename || ""}
                    </div>
                    {pdfUrl ? (
                        <div className="absolute inset-0 overflow-auto p-6 [&>div:first-child]:min-h-full">
                            <div className="mx-auto min-h-full w-full max-w-[760px] bg-[#f6f6f6]">
                                <PdfViewer
                                    fileUrl={pdfUrl}
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={onPageChange}
                                    onTotalPagesChange={onTotalPagesChange}
                                    zoom={zoom}
                                    onZoomChange={onZoomChange}
                                />
                            </div>
                        </div>
                    ) : selectedDoc?.is_password_protected ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
                            {/* Lock icon */}
                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#f7871f]/10 ring-1 ring-[#f7871f]/20">
                                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f7871f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                            </div>
                            <div className="text-center">
                                <p className="text-base font-semibold text-white">{te("pdfLocked")}</p>
                                <p className="mt-1 text-sm text-[#8d8175]">{te("pdfLockedDesc")}</p>
                            </div>
                            <button
                                onClick={onUnlock}
                                className="inline-flex items-center gap-2 rounded-xl bg-[#f7871f] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ce5a00]"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                                {te("unlockPdf")}
                            </button>
                        </div>
                    ) : (
                        <div className="flex h-full items-center justify-center text-[#7e7267] text-sm">
                            {te("selectPdf")}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}