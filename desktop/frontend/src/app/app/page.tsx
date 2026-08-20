"use client";

import React from "react";
import Link from "next/link";
import { api } from "../../shared/api";
import { useAuth } from "../../shared/auth";
import { getApiBaseUrl, isTauri, tauriInvoke } from "../../shared/tauri";
import PdfViewer from "../../components/PdfViewer";
import MetadataModal from "../../components/MetadataModal";
import RemovePagesModal from "../../components/RemovePagesModal";
import ReorderPagesModal from "../../components/ReorderPagesModal";
import SplitPagesModal from "../../components/SplitPagesModal";
import LockUnlockModal from "../../components/LockUnlockModal";
import GuestConvertBanner from "../components/GuestConvertBanner";
import { usePreferences } from "../../lib/preferences";
import type { PdfDocument } from "../../shared/types";

const API_BASE = getApiBaseUrl();

export default function EditorPage() {
    const { user } = useAuth();
    const { prefs } = usePreferences();
    const [docs, setDocs] = React.useState<PdfDocument[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [selectedDoc, setSelectedDoc] = React.useState<PdfDocument | null>(null);
    const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
    const [currentPage, setCurrentPage] = React.useState(1);
    const [totalPages, setTotalPages] = React.useState(0);
    const [zoom, setZoom] = React.useState(prefs.default_zoom / 100);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = React.useState(false);
    const [uploadError, setUploadError] = React.useState<string | null>(null);
    const [metadataOpen, setMetadataOpen] = React.useState(false);
    const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null);
    const [removePagesOpen, setRemovePagesOpen] = React.useState(false);
    const [reorderOpen, setReorderOpen] = React.useState(false);
    const [splitOpen, setSplitOpen] = React.useState(false);
    const [lockOpen, setLockOpen] = React.useState(false);
    const [renameId, setRenameId] = React.useState<string | null>(null);
    const [renameValue, setRenameValue] = React.useState("");
    const [pdfRefreshKey, setPdfRefreshKey] = React.useState(0);
    const pdfUrlRef = React.useRef<string | null>(null);

    async function handleDownload() {
        if (!selectedDoc) return;
        try {
            const blob = await api.downloadPdf(selectedDoc.id);
            const arrayBuf = await blob.arrayBuffer();
            const data = Array.from(new Uint8Array(arrayBuf));
            const saved = await tauriInvoke<string>("dialog_save", {
                defaultName: selectedDoc.original_filename,
                data,
            });
            if (saved) {
                // Brief feedback — could be a toast in the future
                console.log("PDF salvato in:", saved);
            }
        } catch (err) {
            console.error("Download failed:", err);
        }
    }

    async function handleUploadFile(file: File) {
        if (!file.name.toLowerCase().endsWith(".pdf")) return;
        setUploadError(null);
        try {
            const uploaded = await api.uploadPdf(file);
            setDocs((prev) => [uploaded, ...prev]);
            setSelectedDoc(uploaded);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("Upload failed:", msg);
            setUploadError(msg);
        }
    }

    // Refresh CSRF token on mount (required for sidecar writes)
    React.useEffect(() => {
        api.refreshCsrf();
    }, []);

    // Sync zoom when preferences change (settings page)
    React.useEffect(() => {
        setZoom(prefs.default_zoom / 100);
    }, [prefs.default_zoom]);

    // Document-level drag-and-drop for Tauri webview
    React.useEffect(() => {
        function onDragOver(e: DragEvent) { e.preventDefault(); setDragOver(true); }
        function onDragLeave() { setDragOver(false); }
        function onDrop(e: DragEvent) {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer?.files?.[0];
            if (file) handleUploadFile(file);
        }
        document.addEventListener("dragover", onDragOver);
        document.addEventListener("dragleave", onDragLeave);
        document.addEventListener("drop", onDrop);
        return () => {
            document.removeEventListener("dragover", onDragOver);
            document.removeEventListener("dragleave", onDragLeave);
            document.removeEventListener("drop", onDrop);
        };
    }, []);

    // Open native file picker, optionally starting from wizard folder
    async function handleOpenLocal() {
        if (isTauri()) {
            const defaultPath = typeof window !== "undefined"
                ? localStorage.getItem("pdfeditor_work_folder") || undefined
                : undefined;
            const filePath = await tauriInvoke<string>("dialog_open", {
                defaultPath: defaultPath,
            });
            if (!filePath) return;

            // Read file contents via IPC command
            const raw = await tauriInvoke<number[]>("read_file_binary", { path: filePath });
            if (!raw) return;

            const blob = new Blob([new Uint8Array(raw)], { type: "application/pdf" });
            const file = new File(
                [blob],
                filePath.split(/[/\\]/).pop() || "document.pdf",
                { type: "application/pdf" }
            );
            handleUploadFile(file);
        } else {
            // Fallback for browser: use hidden file input (no default path available)
            fileInputRef.current?.click();
        }
    }

    function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) handleUploadFile(file);
        // Reset so the same file can be picked again
        e.target.value = "";
    }

    React.useEffect(() => {
        let cancelled = false;
        let retries = 0;
        const maxRetries = 10;

        async function loadDocs() {
            while (retries < maxRetries && !cancelled) {
                try {
                    const res = await api.listPdfs(0, 100);
                    const items = res.items || [];
                    if (!cancelled) {
                        setDocs(items);
                        if (items.length > 0) setSelectedDoc(items[0]);
                        setLoading(false);
                    }
                    return;
                } catch {
                    retries++;
                    await new Promise((r) => setTimeout(r, 2000));
                }
            }
            if (!cancelled) setLoading(false);
        }
        loadDocs();
        return () => { cancelled = true; };
    }, []);

    // Load PDF blob URL when a document is selected
    // IMPORTANT: NEVER revoke blob URLs manually — PDF.js reads them
    // asynchronously in a web worker. Revoking before the worker finishes
    // causes ERR_FILE_NOT_FOUND and a blank canvas.
    React.useEffect(() => {
        if (!selectedDoc) {
            setPdfUrl(null);
            return;
        }

        let cancelled = false;
        const docId = selectedDoc?.id;
        api.downloadPdf(docId!)
            .then((blob) => {
                if (cancelled) return;
                const url = URL.createObjectURL(blob);
                setPdfUrl(url);
            })
            .catch((err) => {
                if (cancelled) return;
                // If the PDF is password-protected, don't delete it — show the locked overlay
                if (err?.message?.includes("protetto da password") || selectedDoc?.is_password_protected) {
                    setPdfUrl(null);
                    return;
                }
                if (docId) {
                    setDocs((prev) => prev.filter((d) => d.id !== docId));
                    setSelectedDoc(null);
                }
            });

        return () => {
            cancelled = true;
            // Do NOT revoke the blob URL here — the PDF.js worker may still
            // be reading it. Blobs are released when the browser decides.
        };
    }, [selectedDoc?.id, pdfRefreshKey]);

    function formatFileSize(bytes: number): string {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    }

    function formatDate(dateStr: string): string {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return mins + "m ago";
        const hours = Math.floor(mins / 60);
        if (hours < 24) return hours + "h ago";
        const days = Math.floor(hours / 24);
        if (days < 7) return days + "d ago";
        return d.toLocaleDateString();
    }
    return (
        <div className="h-screen bg-[#17120f] text-[#f4f1ee] flex flex-col overflow-hidden">
            <div className="flex-1 grid grid-cols-[296px_1fr_292px] min-h-0">
                <aside className="flex flex-col border-r border-white/10 bg-[#1f1914] min-h-0">
                    <div className="p-4 shrink-0">
                        <button onClick={handleOpenLocal} className="w-full cursor-pointer rounded-[14px] bg-[#f7871f] py-2.5 text-sm font-medium text-white shadow-sm shadow-[#f7871f]/30 transition hover:bg-[#ce5a00]">
                            Open Local PDF
                        </button>
                        <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileInputChange} />
                        {uploadError && (
                            <p className="mt-2 text-[11px] text-red-400 break-words">{uploadError}</p>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto border-y border-white/8 px-5 py-5 min-h-0">
                        <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-[#918476]">Recent documents</p>
                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-16 rounded-2xl bg-white/[0.03] animate-pulse" />
                                ))}
                            </div>
                        ) : docs.length === 0 ? (
                            <p className="text-[12px] text-[#7e7267] text-center py-8">Nessun documento. Apri un PDF per iniziare.</p>
                        ) : (
                            <div className="space-y-3">
                                {docs.map((doc) => (
                                    <div
                                        key={doc.id}
                                        className={`doc-item rounded-2xl border p-3 cursor-pointer transition ${selectedDoc?.id === doc.id ? "border-white/10 bg-white/[0.03]" : "border-transparent hover:bg-white/[0.02]"
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div
                                                onClick={() => setSelectedDoc(doc)}
                                                className="flex items-start gap-3 flex-1 min-w-0"
                                            >
                                                <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold shrink-0 ${selectedDoc?.id === doc.id ? "bg-[#3e2717] text-[#f7871f]" : "bg-white/8 text-[#8f8377]"
                                                    }`}>
                                                    PDF
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    {renameId === doc.id ? (
                                                        <input
                                                            value={renameValue}
                                                            onChange={(e) => setRenameValue(e.target.value)}
                                                            onBlur={() => setRenameId(null)}
                                                            onKeyDown={async (e) => {
                                                                if (e.key === "Enter") {
                                                                    setRenameId(null);
                                                                    if (renameValue.trim() && renameValue !== doc.original_filename) {
                                                                        try {
                                                                            await api.updateMetadata(doc.id, { new_filename: renameValue.trim() });
                                                                            setDocs((prev) => prev.map((d) => d.id === doc.id ? { ...d, original_filename: renameValue.trim() } : d));
                                                                        } catch { /* ignore */ }
                                                                    }
                                                                }
                                                            }}
                                                            className="w-full rounded-lg border border-[#f7871f]/50 bg-[#1f1914] px-2 py-1 text-[14px] font-semibold text-white outline-none"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <p
                                                            className="text-[14px] font-semibold leading-tight text-[#f3ede7] truncate cursor-text"
                                                            onDoubleClick={() => { setRenameId(doc.id); setRenameValue(doc.original_filename); }}
                                                        >
                                                            {doc.original_filename}
                                                        </p>
                                                    )}
                                                    <p className="mt-1 font-mono text-[10px] text-[#7e7267]">
                                                        {formatFileSize(doc.file_size)} · {formatDate(doc.updated_at)}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(doc.id); }}
                                                className="mt-1 h-7 w-7 rounded-lg text-[#7e7267] hover:bg-red-500/10 hover:text-red-400 transition-colors shrink-0"
                                                title="Delete PDF"
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
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#918476]">Cloud Sync</p>
                            <span className="h-2.5 w-2.5 rounded-full bg-[#3ec35f]" />
                        </div>
                        <div className="flex items-center gap-3">
                            <Link href="/settings" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm hover:bg-white/15 transition-colors" title="Impostazioni">
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
                                    <p className="text-sm font-semibold leading-tight truncate">{user?.full_name || "Utente"}</p>
                                    <p className="text-[12px] text-[#8d8175]">{user?.license_tier || "Free"} License</p>
                                </div>
                            </Link>
                        </div>
                    </div>
                </aside>

                <main className="flex flex-col border-r border-white/10 bg-[#13100d] min-h-0">
                    <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#201a15] px-4">
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-1">
                                {["Edit", "Organize", "Convert"].map((label) => (
                                    <button key={label} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${label === "Edit" ? "border border-white/10 bg-[#201a15] text-white" : "text-[#9a8d80]"}`}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                            {totalPages > 0 && (
                                <div className="flex items-center gap-1 ml-2 text-[11px] text-[#9a8d80] font-mono">
                                    <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} className="h-7 w-7 rounded hover:bg-white/6" disabled={currentPage <= 1}>
                                        ◀
                                    </button>
                                    <span className="px-1">{currentPage} / {totalPages}</span>
                                    <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} className="h-7 w-7 rounded hover:bg-white/6" disabled={currentPage >= totalPages}>
                                        ▶
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 mr-2 text-[11px] font-mono text-[#9a8d80]">
                                <button onClick={() => setZoom(Math.max(0.25, zoom - 0.25))} className="h-7 w-7 rounded hover:bg-white/6">−</button>
                                <span className="w-10 text-center">{Math.round(zoom * 100)}%</span>
                                <button onClick={() => setZoom(Math.min(3, zoom + 0.25))} className="h-7 w-7 rounded hover:bg-white/6">+</button>
                            </div>
                            {"Merge".split(" ").map((item) => (
                                <button key={item} className="h-8 rounded-lg px-2.5 text-xs font-medium transition-colors hover:bg-white/6 hover:text-white">{item}</button>
                            ))}
                            <button
                                onClick={() => setSplitOpen(true)}
                                disabled={!selectedDoc}
                                className="h-8 rounded-lg px-2.5 text-xs font-medium transition-colors hover:bg-white/6 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Split
                            </button>
                            <button
                                onClick={handleDownload}
                                disabled={!selectedDoc}
                                className="h-8 rounded-lg px-2.5 text-xs font-medium transition-colors hover:bg-white/6 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Download
                            </button>
                            <button
                                onClick={() => setReorderOpen(true)}
                                disabled={!selectedDoc}
                                className="h-8 rounded-lg px-2.5 text-xs font-medium transition-colors hover:bg-white/6 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Reorder
                            </button>
                            <button
                                onClick={() => setRemovePagesOpen(true)}
                                disabled={!selectedDoc}
                                className="h-8 rounded-lg px-2.5 text-xs font-medium transition-colors hover:bg-white/6 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Remove
                            </button>
                            <button
                                onClick={() => setMetadataOpen(true)}
                                disabled={!selectedDoc}
                                className="h-8 rounded-lg px-2.5 text-xs font-medium transition-colors hover:bg-white/6 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Metadata
                            </button>
                        </div>
                    </header>

                    <div className="flex-1 bg-black p-6 overflow-hidden relative">
                        {dragOver && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#f7871f]/10 border-2 border-dashed border-[#f7871f]/50 rounded-2xl m-6 pointer-events-none">
                                <p className="text-lg font-semibold text-[#f7871f]">Rilascia per caricare il PDF</p>
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
                                            onPageChange={setCurrentPage}
                                            onTotalPagesChange={setTotalPages}
                                            zoom={zoom}
                                            onZoomChange={setZoom}
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
                                        <p className="text-base font-semibold text-white">PDF protetto da password</p>
                                        <p className="mt-1 text-sm text-[#8d8175]">Inserisci la password per visualizzare questo documento</p>
                                    </div>
                                    <button
                                        onClick={() => setLockOpen(true)}
                                        className="inline-flex items-center gap-2 rounded-xl bg-[#f7871f] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ce5a00]"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                        </svg>
                                        Sblocca PDF
                                    </button>
                                </div>
                            ) : (
                                <div className="flex h-full items-center justify-center text-[#7e7267] text-sm">
                                    Seleziona o apri un PDF per iniziare
                                </div>
                            )}
                        </div>
                    </div>
                </main>

                <aside className="flex flex-col bg-[#201a15] p-5">
                    <h3 className="mb-4 text-xs font-bold uppercase tracking-widest">Page Metadata</h3>
                    <div className="mt-4 space-y-3 border-b border-white/10 pb-5">
                        {selectedDoc ? (
                            <>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-[#948779]">Filename</span>
                                    <span className="text-xs font-semibold text-white text-right truncate max-w-[140px]">{selectedDoc.original_filename}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-[#948779]">Size</span>
                                    <span className="text-xs font-semibold text-white">{formatFileSize(selectedDoc.file_size)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-[#948779]">Pages</span>
                                    <span className="text-xs font-semibold text-white">{selectedDoc.page_count}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-[#948779]">Created</span>
                                    <span className="text-xs font-semibold text-white">{new Date(selectedDoc.created_at).toLocaleDateString()}</span>
                                </div>
                            </>
                        ) : (
                            <p className="text-xs text-[#7e7267]">Nessun PDF selezionato</p>
                        )}
                    </div>

                    <h4 className="mt-6 mb-4 text-xs font-bold uppercase tracking-widest">Fast Actions</h4>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <button disabled className="rounded-[14px] border border-white/10 bg-white/[0.03] p-3 text-center transition-all hover:border-[#f7871f]/40 hover:bg-[#2a231d] disabled:opacity-30 disabled:cursor-not-allowed">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8f8377]">MERGE</p>
                        </button>
                        <button
                            onClick={() => setSplitOpen(true)}
                            disabled={!selectedDoc}
                            className="rounded-[14px] border border-white/10 bg-white/[0.03] p-3 text-center transition-all hover:border-[#f7871f]/40 hover:bg-[#2a231d] disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8f8377]">SPLIT</p>
                        </button>
                        <button
                            onClick={() => setLockOpen(true)}
                            disabled={!selectedDoc}
                            className="rounded-[14px] border border-white/10 bg-white/[0.03] p-3 text-center transition-all hover:border-[#f7871f]/40 hover:bg-[#2a231d] disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8f8377]">
                                {selectedDoc?.is_password_protected ? "UNLOCK" : "LOCK"}
                            </p>
                        </button>
                        {["OCR"].map((k) => (
                            <button key={k} disabled className="rounded-[14px] border border-white/10 bg-white/[0.03] p-3 text-center transition-all hover:border-[#f7871f]/40 hover:bg-[#2a231d] disabled:opacity-30 disabled:cursor-not-allowed">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8f8377]">{k}</p>
                            </button>
                        ))}
                    </div>
                </aside>
            </div>

            <RemovePagesModal
                open={removePagesOpen}
                pdfId={selectedDoc?.id ?? ""}
                pdfName={selectedDoc?.original_filename ?? ""}
                totalPages={selectedDoc?.page_count ?? 0}
                pdfUrl={pdfUrl}
                onClose={() => setRemovePagesOpen(false)}
                onSaved={(updatedDoc) => {
                    setDocs((prev) => {
                        const oldId = selectedDoc?.id;
                        if (oldId) return [updatedDoc, ...prev.filter((d) => d.id !== oldId)];
                        return [updatedDoc, ...prev];
                    });
                    setSelectedDoc(updatedDoc);
                    setPdfRefreshKey((k) => k + 1);
                }}
            />

            <ReorderPagesModal
                open={reorderOpen}
                pdfId={selectedDoc?.id ?? ""}
                pdfName={selectedDoc?.original_filename ?? ""}
                totalPages={selectedDoc?.page_count ?? 0}
                pdfUrl={pdfUrl}
                onClose={() => setReorderOpen(false)}
                onSaved={(updatedDoc) => {
                    setDocs((prev) => {
                        const oldId = selectedDoc?.id;
                        if (oldId) return [updatedDoc, ...prev.filter((d) => d.id !== oldId)];
                        return [updatedDoc, ...prev];
                    });
                    setSelectedDoc(updatedDoc);
                    setPdfRefreshKey((k) => k + 1);
                }}
            />

            <SplitPagesModal
                open={splitOpen}
                pdfId={selectedDoc?.id ?? ""}
                pdfName={selectedDoc?.original_filename ?? ""}
                totalPages={selectedDoc?.page_count ?? 0}
                pdfUrl={pdfUrl}
                onClose={() => setSplitOpen(false)}
                onSaved={(newDocs) => {
                    setDocs((prev) => [...newDocs, ...prev]);
                    setSelectedDoc(newDocs[0]);
                    setPdfRefreshKey((k) => k + 1);
                }}
            />

            <LockUnlockModal
                open={lockOpen}
                pdfId={selectedDoc?.id ?? ""}
                pdfName={selectedDoc?.original_filename ?? ""}
                isProtected={selectedDoc?.is_password_protected ?? false}
                onClose={() => setLockOpen(false)}
                onSaved={(updatedDoc) => {
                    setDocs((prev) => {
                        const oldId = selectedDoc?.id;
                        if (oldId) return [updatedDoc, ...prev.filter((d) => d.id !== oldId)];
                        return [updatedDoc, ...prev];
                    });
                    setSelectedDoc(updatedDoc);
                    setPdfRefreshKey((k) => k + 1);
                }}
            />

            <MetadataModal
                open={metadataOpen}
                pdfId={selectedDoc?.id ?? ""}
                pdfName={selectedDoc?.original_filename ?? ""}
                onClose={() => setMetadataOpen(false)}
                onSaved={(updatedDoc) => {
                    setDocs((prev) => {
                        const oldId = selectedDoc?.id;
                        if (oldId) return [updatedDoc, ...prev.filter((d) => d.id !== oldId)];
                        return [updatedDoc, ...prev];
                    });
                    setSelectedDoc(updatedDoc);
                    setPdfRefreshKey((k) => k + 1);
                }}
            />

            {/* Delete confirmation dialog */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#201a15] p-6 shadow-2xl">
                        <h2 className="text-base font-bold text-white mb-2">Delete PDF</h2>
                        <p className="text-sm text-[#9a8d80] mb-6">
                            Are you sure you want to delete this PDF? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[#9a8d80] transition hover:bg-white/5"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    const id = deleteConfirm;
                                    setDeleteConfirm(null);
                                    try {
                                        await api.deletePdf(id);
                                        setDocs((prev) => prev.filter((d) => d.id !== id));
                                        if (selectedDoc?.id === id) {
                                            setSelectedDoc(null);
                                            setPdfUrl(null);
                                        }
                                    } catch (err) {
                                        console.error("Delete failed:", err);
                                    }
                                }}
                                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <footer className="h-10 shrink-0 border-t border-white/10 bg-[#0b0a09] px-5 text-[10px] text-[#7f7468]">
                <div className="mx-auto flex h-full max-w-[1880px] items-center justify-between">
                    <div className="flex items-center gap-5">
                        <span className="text-[#48c769]">●</span>
                        <span>Sidecar API: Online ({API_BASE.replace("http://", "")})</span>
                        <span>UTF-8</span>
                        <span>SQLite: local.db</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <span>PyMuPDF v1.24.2</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
