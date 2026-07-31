"use client";

import React from "react";
import { api } from "../../shared/api";
import { useAuth } from "../../shared/auth";
import { getApiBaseUrl } from "../../shared/tauri";
import PdfViewer from "../../components/PdfViewer";
import GuestConvertBanner from "../components/GuestConvertBanner";
import type { PdfDocument } from "../../shared/types";

const API_BASE = getApiBaseUrl();

const recentDocs = [
    { name: "architecture_adr_022.pdf", meta: "1.2 MB · 24m ago", active: true },
    { name: "backend_api_specs.pdf", meta: "456 KB · 2h ago" },
    { name: "tax_return_2025_final.pdf", meta: "8.9 MB · yesterday" },
    { name: "ui_wireframes_v3.pdf", meta: "3.4 MB · 2d ago" },
    { name: "pymupdf_reference.pdf", meta: "12.1 MB · 1w ago" },
];

const metaRows = [
    ["Author", "Mirko Bechini"],
    ["Software", "PyMuPDF v1.24"],
    ["Created", "25-06-2026"],
    ["Pages", "12"],
    ["Size", "1.24 MB"],
] as const;

const actions = [
    ["MERGE", "Join Files"],
    ["SPLIT", "By Range"],
    ["OCR", "Scan Text"],
    ["LOCK", "Password"],
] as const;

const modeTabs: ReadonlyArray<readonly [string, boolean]> = [
    ["Edit", true],
    ["Organize", false],
    ["Convert", false],
];

function DocMock({ pageNum, totalPages }: { pageNum: number; totalPages: number }) {
    return (
        <div className="mx-auto h-full w-full max-w-[760px] bg-[#f6f6f6] p-10 text-[#1b1f23]">
            <div className="mb-5 h-8 w-[64%] bg-[#1f2328]" />
            <div className="space-y-3">
                <div className="h-3 rounded-full bg-[#ececec]" />
                <div className="h-3 rounded-full bg-[#ececec]" />
                <div className="h-3 w-[92%] rounded-full bg-[#ececec]" />
                <div className="h-3 w-[84%] rounded-full bg-[#ececec]" />
            </div>
            <div className="my-10 flex h-[150px] items-center justify-center rounded-xl border border-[#f2dfc5] bg-[#f6efdf] text-xs font-semibold tracking-[0.2em] text-[#e09c4f]">
                SYSTEM_DIAG_V2.SVG
            </div>
            <div className="space-y-3">
                <div className="h-3 rounded-full bg-[#ececec]" />
                <div className="h-3 w-[82%] rounded-full bg-[#ececec]" />
                <div className="h-3 w-[88%] rounded-full bg-[#ececec]" />
            </div>
            <div className="mt-20 border-t border-[#ececec] pt-8 text-[10px] font-semibold tracking-[0.18em] text-[#c3c3c3]">
                PDF/A-3b · 300 DPI · TAGGED DOCUMENT
            </div>
        </div>
    );
}

export default function EditorPage() {
    const { user } = useAuth();
    const [docs, setDocs] = React.useState<PdfDocument[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [selectedDoc, setSelectedDoc] = React.useState<PdfDocument | null>(null);
    const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
    const [currentPage, setCurrentPage] = React.useState(1);
    const [totalPages, setTotalPages] = React.useState(0);
    const [zoom, setZoom] = React.useState(1);

    React.useEffect(() => {
        api.listPdfs(0, 10)
            .then((res) => {
                setDocs(res.items || []);
                if (res.items && res.items.length > 0) {
                    setSelectedDoc(res.items[0]);
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
        api.downloadPdf(selectedDoc.id)
            .then((blob) => {
                if (cancelled) return;
                const url = URL.createObjectURL(blob);
                setPdfUrl(url);
            })
            .catch(() => {
                // Download failed
            });

        return () => {
            cancelled = true;
            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        };
    }, [selectedDoc?.id]);

    async function handleOpenLocal() {
        try {
            const { tauriInvoke } = await import("../../shared/tauri");
            // Use Tauri dialog API to open a file picker
            const result = await tauriInvoke<{ path: string }>("dialog_open", {
                filters: [{ name: "PDF", extensions: ["pdf"] }],
                multiple: false,
            });
            if (result?.path) {
                // Upload the selected file to the sidecar
                const fileInput = document.createElement("input");
                fileInput.type = "file";
                fileInput.accept = ".pdf";
                fileInput.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) return;
                    try {
                        const uploaded = await api.uploadPdf(file);
                        setDocs((prev) => [uploaded, ...prev]);
                        setSelectedDoc(uploaded);
                    } catch {
                        // Upload failed
                    }
                };
                fileInput.click();
            }
        } catch {
            // Fallback: file input
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".pdf";
            input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;
                try {
                    const uploaded = await api.uploadPdf(file);
                    setDocs((prev) => [uploaded, ...prev]);
                    setSelectedDoc(uploaded);
                } catch {
                    // Upload failed
                }
            };
            input.click();
        }
    }

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
        <div className="min-h-screen bg-[#17120f] text-[#f4f1ee]">
            <div className="grid min-h-screen grid-cols-[296px_1fr_292px]">
                <aside className="flex flex-col border-r border-white/10 bg-[#1f1914]">
                    <div className="p-4">
                        <button onClick={handleOpenLocal} className="w-full rounded-[14px] bg-[#f7871f] py-2.5 text-sm font-medium text-white shadow-sm shadow-[#f7871f]/30 transition hover:bg-[#ce5a00]">
                            Open Local PDF
                        </button>
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
                                        className={`rounded-2xl border p-3 cursor-pointer transition ${selectedDoc?.id === doc.id ? "border-white/10 bg-white/[0.03]" : "border-transparent hover:bg-white/[0.02]"
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
                                                    {formatFileSize(doc.file_size)} · {formatDate(doc.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <GuestConvertBanner />

                    <div className="mt-auto border-t border-white/8 p-5">
                        <div className="mb-3 flex items-center justify-between">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#918476]">Cloud Sync</p>
                            <span className="h-2.5 w-2.5 rounded-full bg-[#3ec35f]" />
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3e2717] text-sm font-bold text-[#f7871f]">
                                {user?.full_name?.charAt(0)?.toUpperCase() || "U"}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold leading-tight truncate">{user?.full_name || "Utente"}</p>
                                <p className="text-[12px] text-[#8d8175]">{user?.license_tier || "Free"} License</p>
                            </div>
                        </div>
                    </div>
                </aside>

                <main className="flex min-h-screen flex-col border-r border-white/10 bg-[#13100d]">
                    <header className="flex h-14 items-center justify-between border-b border-white/10 bg-[#201a15] px-4">
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

                    <div className="flex-1 bg-black p-6">
                        <div className="relative h-full border border-white/6 bg-[#0f0d0b] p-6">
                            <div className="absolute left-4 top-3 z-10 font-mono text-[10px] text-[#d8d8d8]">
                                {selectedDoc?.original_filename || "Page 1 of 12"}
                            </div>
                            {pdfUrl ? (
                                <div className="mx-auto h-full w-full max-w-[760px] bg-[#f6f6f6] overflow-auto p-6">
                                    <PdfViewer
                                        fileUrl={pdfUrl}
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={setCurrentPage}
                                        onTotalPagesChange={setTotalPages}
                                        zoom={zoom}
                                        onZoomChange={setZoom}
                                    />
                                    <div className="mt-6 border-t border-[#ececec] pt-4 text-[10px] font-semibold tracking-[0.18em] text-[#c3c3c3]">
                                        PDF/A-3b · 300 DPI · TAGGED DOCUMENT
                                    </div>
                                </div>
                            ) : (
                                <div className="mx-auto h-full w-full max-w-[760px] bg-[#f6f6f6] p-10">
                                    <div className="mb-5 h-8 w-[64%] bg-[#1f2328]" />
                                    <div className="space-y-3">
                                        <div className="h-3 rounded-full bg-[#ececec]" />
                                        <div className="h-3 rounded-full bg-[#ececec]" />
                                        <div className="h-3 w-[92%] rounded-full bg-[#ececec]" />
                                        <div className="h-3 w-[84%] rounded-full bg-[#ececec]" />
                                    </div>
                                    <div className="my-10 flex h-[150px] items-center justify-center rounded-xl border border-[#f2dfc5] bg-[#f6efdf] text-xs font-semibold tracking-[0.2em] text-[#e09c4f]">
                                        SYSTEM_DIAG_V2.SVG
                                    </div>
                                    <div className="space-y-3">
                                        <div className="h-3 rounded-full bg-[#ececec]" />
                                        <div className="h-3 w-[82%] rounded-full bg-[#ececec]" />
                                        <div className="h-3 w-[88%] rounded-full bg-[#ececec]" />
                                    </div>
                                    <div className="mt-20 border-t border-[#ececec] pt-8 text-[10px] font-semibold tracking-[0.18em] text-[#c3c3c3]">
                                        PDF/A-3b · 300 DPI · TAGGED DOCUMENT
                                    </div>
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
                        {actions.map(([k, v]) => (
                            <button key={k} className="rounded-[14px] border border-white/10 bg-white/[0.03] p-3 text-center transition-all hover:border-[#f7871f]/40 hover:bg-[#2a231d]">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8f8377]">{k}</p>
                                <p className="mt-1 text-base font-semibold leading-tight">{v}</p>
                            </button>
                        ))}
                    </div>

                    <div className="mt-6 rounded-2xl border border-[#8a4f22] bg-[#3a2212] p-4">
                        <p className="text-xs font-bold text-[#ff9a41]">Pro Version Active</p>
                        <p className="mt-2 text-xs text-[#d29055]">Unlimited cloud sync, batch processing and OCR enabled.</p>
                    </div>
                </aside>
            </div>

            <footer className="fixed bottom-0 left-0 right-0 h-10 border-t border-white/10 bg-[#0b0a09] px-5 text-[10px] text-[#7f7468]">
                <div className="mx-auto flex h-full max-w-[1880px] items-center justify-between">
                    <div className="flex items-center gap-5">
                        <span className="text-[#48c769]">●</span>
                        <span>Sidecar API: Online ({API_BASE.replace("http://", "")})</span>
                        <span>UTF-8</span>
                        <span>SQLite: local.db</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <span>PyMuPDF v1.24.2</span>
                        <span className="font-semibold text-white">Snapshots 3 / 10</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
