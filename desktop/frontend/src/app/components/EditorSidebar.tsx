// Sidebar sinistra dell'editor desktop — estratta da app/app/page.tsx (issue #881, T3).
// Presentazionale + mini-logica locale (liste, multi-select, rename). Lo stato
// "pesante" (docs, selezione, cloud sync, open/upload) arriva via props dal padre.

import Link from "next/link";
import type { ChangeEvent, RefObject } from "react";
import type { PdfDocument, User } from "../../shared/types";
import { getPlatformIcon, formatFileSize, formatDate } from "../../lib/editor-utils";
import GuestConvertBanner from "../components/GuestConvertBanner";

export type SyncStatusMap = Record<string, "synced" | "pending" | "error" | undefined>;

export type EditorSidebarProps = {
    te: (k: string, o?: Record<string, unknown>) => string;
    user: User | null;
    docs: PdfDocument[];
    loading: boolean;
    selectedDoc: PdfDocument | null;
    syncStatus: SyncStatusMap;
    multiSelect: boolean;
    selectedIds: Set<string>;
    renameId: string | null;
    renameValue: string;
    uploadError: string | null;
    fileInputRef: RefObject<HTMLInputElement | null>;
    onOpenLocal: () => void;
    onFileInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onToggleMultiSelect: () => void;
    onToggleSelectAll: () => void;
    onToggleSelect: (id: string) => void;
    onBatchDelete: () => void;
    onBatchExport: () => void;
    onSelectDoc: (doc: PdfDocument) => void;
    onRenameIdChange: (id: string | null) => void;
    onRenameValueChange: (v: string) => void;
    onRenameCommit: (doc: PdfDocument, newName: string) => void;
    onDeleteRequest: (id: string) => void;
};

export function EditorSidebar(props: EditorSidebarProps) {
    const {
        te, user, docs, loading, selectedDoc, syncStatus,
        multiSelect, selectedIds, renameId, renameValue, uploadError, fileInputRef,
        onOpenLocal, onFileInputChange, onToggleMultiSelect, onToggleSelectAll,
        onToggleSelect, onBatchDelete, onBatchExport, onSelectDoc,
        onRenameIdChange, onRenameValueChange, onRenameCommit, onDeleteRequest,
    } = props;

    return (
        <aside className="flex flex-col border-r border-white/10 bg-[#1f1914] min-h-0">
            <div className="p-4 shrink-0">
                <button onClick={onOpenLocal} className="w-full cursor-pointer rounded-[14px] bg-[#f7871f] py-2.5 text-sm font-medium text-white shadow-sm shadow-[#f7871f]/30 transition hover:bg-[#ce5a00]">
                    {te("openLocalPdf")}
                </button>
                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={onFileInputChange} />
                {uploadError && (
                    <p className="mt-2 text-[11px] text-red-400 break-words">{uploadError}</p>
                )}
            </div>

            <div className="flex-1 overflow-y-auto border-y border-white/8 px-5 py-5 min-h-0">
                <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-[#918476]">{te("recentDocuments")}</p>
                {/* Multi-select toolbar */}
                <div className="mb-2 flex items-center gap-2">
                    <button
                        onClick={onToggleMultiSelect}
                        className={`rounded-lg px-2 py-1 text-[12px] font-medium transition ${multiSelect ? "bg-[#f7871f] text-white" : "border border-white/10 text-[#9a8d80] hover:bg-white/5"}`}
                        data-testid="multi-select-toggle"
                    >
                        {multiSelect ? te("done") : te("select")}
                    </button>
                    {multiSelect && (
                        <>
                            <button
                                onClick={onToggleSelectAll}
                                className="rounded-lg border border-white/10 px-2 py-1 text-[12px] font-medium text-[#9a8d80] transition hover:bg-white/5"
                                data-testid="multi-select-all"
                            >
                                {selectedIds.size === docs.length ? te("deselectAll") : te("selectAll")}
                            </button>
                            <span className="text-[12px] text-[#9a8d80]" data-testid="multi-select-count">
                                {selectedIds.size} {te("selected")}
                            </span>
                        </>
                    )}
                </div>
                {multiSelect && selectedIds.size > 0 && (
                    <div className="mb-2 flex items-center gap-2 rounded-xl bg-[#f7871f]/10 p-2" data-testid="batch-actions">
                        <button
                            onClick={onBatchDelete}
                            className="rounded-lg bg-red-500 px-2 py-1 text-[12px] font-medium text-white transition hover:bg-red-600"
                            data-testid="batch-delete"
                        >
                            🗑️ {te("deleteSelected")}
                        </button>
                        <button
                            onClick={onBatchExport}
                            className="rounded-lg bg-[#f7871f] px-2 py-1 text-[12px] font-medium text-white transition hover:bg-[#e07a10]"
                            data-testid="batch-export"
                        >
                            ⬇ {te("exportSelected")}
                        </button>
                    </div>
                )}
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 rounded-2xl bg-white/[0.03] animate-pulse" />
                        ))}
                    </div>
                ) : docs.length === 0 ? (
                    <p className="text-[12px] text-[#7e7267] text-center py-8">{te("noDocuments")}</p>
                ) : (
                    <div className="space-y-3">
                        {docs.map((doc) => (
                            <div
                                key={doc.id}
                                className={`doc-item rounded-2xl border p-3 cursor-pointer transition ${selectedDoc?.id === doc.id ? "border-white/10 bg-white/[0.03]" : "border-transparent hover:bg-white/[0.02]"} ${multiSelect && selectedIds.has(doc.id) ? "border-[#f7871f]/40 bg-[#f7871f]/5" : ""}`}
                                data-testid={`file-item-${doc.id}`}
                            >
                                <div className="flex items-center gap-3">
                                    {multiSelect && (
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(doc.id)}
                                            onChange={() => onToggleSelect(doc.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="h-4 w-4 accent-[#f7871f]"
                                            data-testid={`file-checkbox-${doc.id}`}
                                        />
                                    )}
                                    <div
                                        onClick={() => multiSelect ? onToggleSelect(doc.id) : onSelectDoc(doc)}
                                        className="flex items-center gap-3 flex-1 min-w-0"
                                    >
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl shrink-0 ${selectedDoc?.id === doc.id ? "bg-[#3e2717]" : "bg-white/8"
                                            }`}>
                                            {getPlatformIcon(doc.upload_source)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            {renameId === doc.id ? (
                                                <input
                                                    value={renameValue}
                                                    onChange={(e) => onRenameValueChange(e.target.value)}
                                                    onBlur={() => onRenameIdChange(null)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            onRenameIdChange(null);
                                                            if (renameValue.trim() && renameValue !== doc.original_filename) {
                                                                onRenameCommit(doc, renameValue.trim());
                                                            }
                                                        }
                                                    }}
                                                    className="w-full rounded-lg border border-[#f7871f]/50 bg-[#1f1914] px-2 py-1 text-[14px] font-semibold text-white outline-none"
                                                    autoFocus
                                                />
                                            ) : (
                                                <p
                                                    className="text-[14px] font-semibold leading-tight text-[#f3ede7] truncate cursor-text"
                                                    onDoubleClick={() => { onRenameIdChange(doc.id); onRenameValueChange(doc.original_filename); }}
                                                >
                                                    {doc.original_filename}
                                                </p>
                                            )}
                                            <p className="mt-1 font-mono text-[10px] text-[#7e7267]">
                                                {formatFileSize(doc.file_size, te)} · {formatDate(doc.created_at, te)}
                                                {syncStatus[doc.id] === "synced" && <span className="ml-2 text-green-400">☁️</span>}
                                                {syncStatus[doc.id] === "pending" && <span className="ml-2 text-yellow-400">⏳</span>}
                                                {syncStatus[doc.id] === "error" && <span className="ml-2 text-red-400">⚠️</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDeleteRequest(doc.id); }}
                                        className="mt-1 h-7 w-7 rounded-lg text-[#7e7267] hover:bg-red-500/10 hover:text-red-400 transition-colors shrink-0"
                                        title={te("deletePdf")}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
                                            <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <GuestConvertBanner />

            <div className="border-t border-white/8 p-5">
                <div className="mb-3 flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#918476]">{te("cloudSync")}</p>
                    <span className="h-2.5 w-2.5 rounded-full bg-[#3ec35f]" />
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/settings" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm hover:bg-white/15 transition-colors" title={te("settings")}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#9a8d80]">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                    </Link>
                    <Link href="/profile" className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80 transition-opacity">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3e2717] text-sm font-bold text-[#f7871f] shrink-0">
                            {user?.full_name?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold leading-tight truncate">{user?.full_name || te("user")}</p>
                            <p className="text-[12px] text-[#8d8175]">{user?.license_tier || "Free"} {te("license")}</p>
                        </div>
                    </Link>
                </div>
            </div>
        </aside>
    );
}