"use client";

import React from "react";
import Link from "next/link";
import { api } from "../../shared/api";
import { useAuth } from "../../shared/auth";
import { getApiBaseUrl, isTauri, tauriInvoke } from "../../shared/tauri";
import PdfViewer from "../../components/PdfViewer";
import GuestConvertBanner from "../components/GuestConvertBanner";
import type { PdfDocument } from "../../shared/types";

const API_BASE = getApiBaseUrl();

export default function EditorPage() {
    const { user } = useAuth();
    const [docs, setDocs] = React.useState<PdfDocument[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [selectedDoc, setSelectedDoc] = React.useState<PdfDocument | null>(null);
    const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
    const [currentPage, setCurrentPage] = React.useState(1);
    const [totalPages, setTotalPages] = React.useState(0);
    const [zoom, setZoom] = React.useState(1);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = React.useState(false);

    async function handleUploadFile(file: File) {
        if (!file.name.toLowerCase().endsWith(".pdf")) return;
        try {
            const uploaded = await api.uploadPdf(file);
            setDocs((prev) => [uploaded, ...prev]);
            setSelectedDoc(uploaded);
        } catch (err) {
            console.error("Upload failed:", err);
        }
    }

    // Refresh CSRF token on mount (required for sidecar writes)
    React.useEffect(() => {
        api.refreshCsrf();
    }, []);

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
        api.listPdfs(0, 10)
            .then(async (res) => {
                const items = res.items || [];
                // Verify all docs exist on disk (remove ghosts)
                const verified: PdfDocument[] = [];
                for (const doc of items) {
                    try {
                        const headRes = await fetch(`${API_BASE}/pdfs/${doc.id}/download`, {
                            method: "HEAD",
                            credentials: "include",
                            headers: { "Authorization": `Bearer ${(api as any).token}` },
                        });
                        if (headRes.ok) {
                            verified.push(doc);
                        } else {
                            // Ghost PDF: remove from DB too
                            api.deletePdf(doc.id).catch(() => { });
                        }
                    } catch {
                        // Network error or 404 — remove from DB
                        api.deletePdf(doc.id).catch(() => { });
                    }
                }
                setDocs(verified);
                if (verified.length > 0) {
                    setSelectedDoc(verified[0]);
                }
            })
            .catch(() => {
                // Sidecar not ready — show empty list
            })
            .finally(() => setLoading(false));
    }, []);

    // Load PDF blob URL when a document is selected
    React.useEffect(() => {
        if (!selectedDoc) {
            setPdfUrl(null);
            return;
        }

        let cancelled = false;
        let currentUrl: string | null = null;
        const docId = selectedDoc?.id;
        api.downloadPdf(docId!)
            .then((blob) => {
                if (cancelled) return;
                const url = URL.createObjectURL(blob);
                currentUrl = url;
                setPdfUrl(url);
            })
            .catch(() => {
                // Download failed — file missing on disk. Remove ghost document from list.
                if (!cancelled && docId) {
                    setDocs((prev) => prev.filter((d) => d.id !== docId));
                    setSelectedDoc(null);
                }
            });

        return () => {
            cancelled = true;
            if (currentUrl) URL.revokeObjectURL(currentUrl);
        };
    }, [selectedDoc?.id]);

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
            <div className="flex-1 grid grid-cols-[296px_1fr_292px] min-h-0 overflow-hidden">
                <aside className="flex flex-col border-r border-white/10 bg-[#1f1914]">
                    <div className="p-4">
                        <button onClick={handleOpenLocal} className="w-full cursor-pointer rounded-[14px] bg-[#f7871f] py-2.5 text-sm font-medium text-white shadow-sm shadow-[#f7871f]/30 transition hover:bg-[#ce5a00]">
                            Open Local PDF
                        </button>
                        <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileInputChange} />
                    </div>

                    <div className="flex-1 overflow-y-auto border-y border-white/8 px-5 py-5">
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
                                        onClick={() => setSelectedDoc(doc)}
                                        className={`doc-item rounded-2xl border p-3 cursor-pointer transition ${selectedDoc?.id === doc.id ? "border-white/10 bg-white/[0.03]" : "border-transparent hover:bg-white/[0.02]"
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${selectedDoc?.id === doc.id ? "bg-[#3e2717] text-[#f7871f]" : "bg-white/8 text-[#8f8377]"
                                                }`}>
                                                PDF
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[14px] font-semibold leading-tight text-[#f3ede7] truncate">{doc.original_filename}</p>
                                                <p className="mt-1 font-mono text-[10px] text-[#7e7267]">
                                                    {formatFileSize(doc.file_size)} · {doc.pdf_creation_date ? formatDate(doc.pdf_creation_date) : formatDate(doc.created_at)}
                                                </p>
                                            </div>
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
                            {"Merge Split Reorder Remove Metadata".split(" ").map((item) => (
                                <button key={item} className="h-8 rounded-lg px-2.5 text-xs font-medium transition-colors hover:bg-white/6 hover:text-white">{item}</button>
                            ))}
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
                            ) : (
                                <div className="flex h-full items-center justify-center text-[#7e7267] text-sm">
                                    Seleziona o apri un PDF per iniziare
                                </div>
                            )}
                        </div>
                    </div>
                </main>

                <aside className="flex flex-col bg-[#201a15] p-5 overflow-hidden">
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
                        {["MERGE", "SPLIT", "OCR", "LOCK"].map((k) => (
                            <button key={k} className="rounded-[14px] border border-white/10 bg-white/[0.03] p-3 text-center transition-all hover:border-[#f7871f]/40 hover:bg-[#2a231d]">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8f8377]">{k}</p>
                            </button>
                        ))}
                    </div>
                </aside>
            </div>

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
