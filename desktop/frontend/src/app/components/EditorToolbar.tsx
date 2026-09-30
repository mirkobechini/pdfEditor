// Toolbar superiore dell'editor desktop — estratta da app/app/page.tsx (issue #881, T4).
// Presentazionale: azioni (download/print/share), navigazione pagine, zoom e i 3
// dropdown organizzare/converti/annota. Lo stato resta nel padre via props/ref.

import type { RefObject } from "react";

export type OpenMenu = "organize" | "convert" | "annotate" | null;

export type EditorToolbarProps = {
    te: (k: string, values?: Record<string, string | number | Date>) => string;
    selected: boolean; // selectedDoc != null
    totalPages: number;
    currentPage: number;
    zoom: number;
    openMenu: OpenMenu;
    organizeRef: RefObject<HTMLDivElement | null>;
    convertRef: RefObject<HTMLDivElement | null>;
    annotateMenuRef: RefObject<HTMLDivElement | null>;
    onDownload: () => void;
    onPrint: () => void;
    onPageChange: (p: number) => void;
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
};

export function EditorToolbar(props: EditorToolbarProps) {
    const {
        te, selected, totalPages, currentPage, zoom, openMenu,
        organizeRef, convertRef, annotateMenuRef,
        onDownload, onPrint, onPageChange, onZoomChange, onToggleMenu,
        onMerge, onSplit, onReorder, onRemovePages,
        onCompress, onImportExport, onReplaceText, onMetadata,
        onSign, onOcr, onAnnotate, onShare,
    } = props;

    const menuBtn = "h-8 rounded-lg px-2.5 text-xs font-medium transition-colors hover:bg-white/6 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed";
    const menuItem = "flex w-full items-center px-3 py-2 text-left text-xs font-medium text-[#d8d8d8] transition-colors hover:bg-white/6 hover:text-white disabled:opacity-30";

    return (
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#201a15] px-4">
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-1">
                    <button className="rounded-lg px-3 py-1.5 text-xs font-semibold border border-white/10 bg-[#201a15] text-white">
                        {te("edit")}
                    </button>
                    <button onClick={onDownload} disabled={!selected} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#9a8d80] hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        {te("download")}
                    </button>
                </div>
                {totalPages > 0 && (
                    <div className="flex items-center gap-1 ml-2 text-[11px] text-[#9a8d80] font-mono">
                        <button onClick={() => onPageChange(Math.max(1, currentPage - 1))} className="h-7 w-7 rounded hover:bg-white/6" disabled={currentPage <= 1}>
                            ◀
                        </button>
                        <span className="px-1">{currentPage} / {totalPages}</span>
                        <button onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} className="h-7 w-7 rounded hover:bg-white/6" disabled={currentPage >= totalPages}>
                            ▶
                        </button>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 mr-2 text-[11px] font-mono text-[#9a8d80]">
                    <button onClick={() => onZoomChange(Math.max(0.25, zoom - 0.25))} className="h-7 w-7 rounded hover:bg-white/6">−</button>
                    <span className="w-10 text-center">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => onZoomChange(Math.min(3, zoom + 0.25))} className="h-7 w-7 rounded hover:bg-white/6">+</button>
                </div>

                {/* Organizza dropdown */}
                <div className="relative" ref={organizeRef}>
                    <button
                        onClick={() => onToggleMenu("organize")}
                        disabled={!selected}
                        data-testid="toolbar-organize"
                        className={menuBtn}
                    >
                        {te("organize")} ▾
                    </button>
                    {openMenu === "organize" && (
                        <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-white/10 bg-[#201a15] py-1 shadow-xl">
                            <button onClick={onMerge} disabled={!selected} className={menuItem}>{te("merge")}</button>
                            <button onClick={onSplit} disabled={!selected} className={menuItem}>{te("split")}</button>
                            <button onClick={onReorder} disabled={!selected} className={menuItem}>{te("reorder")}</button>
                            <button onClick={onRemovePages} disabled={!selected} className={menuItem}>{te("remove")}</button>
                        </div>
                    )}
                </div>

                {/* Converti dropdown */}
                <div className="relative" ref={convertRef}>
                    <button
                        onClick={() => onToggleMenu("convert")}
                        data-testid="toolbar-convert"
                        className={menuBtn}
                    >
                        {te("convert")} ▾
                    </button>
                    {openMenu === "convert" && (
                        <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-white/10 bg-[#201a15] py-1 shadow-xl">
                            <button onClick={onCompress} disabled={!selected} className={menuItem}>{te("compress")}</button>
                            <button onClick={onImportExport} className={menuItem}>{te("importExport")}</button>
                            <button onClick={onReplaceText} disabled={!selected} className={menuItem}>{te("replaceText")}</button>
                            <button onClick={onMetadata} disabled={!selected} className={menuItem}>{te("metadata")}</button>
                        </div>
                    )}
                </div>

                {/* Annota dropdown */}
                <div className="relative" ref={annotateMenuRef}>
                    <button
                        onClick={() => onToggleMenu("annotate")}
                        disabled={!selected}
                        data-testid="toolbar-annotate-menu"
                        className={menuBtn}
                    >
                        {te("annotate")} ▾
                    </button>
                    {openMenu === "annotate" && (
                        <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-white/10 bg-[#201a15] py-1 shadow-xl">
                            <button onClick={onSign} disabled={!selected} className={menuItem}>{te("sign")}</button>
                            <button onClick={onOcr} disabled={!selected} data-testid="toolbar-ocr" className={menuItem}>{te("ocr")}</button>
                            <button onClick={onAnnotate} disabled={!selected} data-testid="toolbar-annotate" className={menuItem}>{te("annotate")}</button>
                        </div>
                    )}
                </div>

                <button onClick={onPrint} disabled={!selected} data-testid="toolbar-print" className={menuBtn}>
                    {te("print")}
                </button>
                <button onClick={onShare} disabled={!selected} data-testid="toolbar-share" className={menuBtn}>
                    {te("share")}
                </button>
            </div>
        </header>
    );
}