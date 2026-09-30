"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { api } from "../../shared/api";
import { useAuth } from "../../shared/auth";
import { getApiBaseUrl, isTauri, tauriInvoke } from "../../shared/tauri";
import PdfViewer from "../../components/PdfViewer";
import MetadataModal from "../../components/MetadataModal";
import RemovePagesModal from "../../components/RemovePagesModal";
import ReorderPagesModal from "../../components/ReorderPagesModal";
import SplitPagesModal from "../../components/SplitPagesModal";
import MergeModal from "../../components/MergeModal";
import CompressModal from "../../components/CompressModal";
import LockUnlockModal from "../../components/LockUnlockModal";
import ReplaceTextModal from "../../components/ReplaceTextModal";
import ImportExportModal from "../../components/ImportExportModal";
import SignModal from "../../components/SignModal";
import OcrModal from "../../components/OcrModal";
import PrintOptionsModal, { type PrintOptions, parsePageRangeList } from "../../components/PrintOptionsModal";
import AnnotationDialog from "../../components/AnnotationDialog";
import ShareDialog from "../../components/ShareDialog";
import { EditorSidebar } from "../components/EditorSidebar";
import { EditorToolbar } from "../components/EditorToolbar";
import { EditorRightPanel } from "../components/EditorRightPanel";
import { DeleteConfirmModal } from "../components/DeleteConfirmModal";
import { EditorFooter } from "../components/EditorFooter";
import { usePreferences } from "../../lib/preferences";
import { useCloudSync } from "../../hooks/useCloudSync";
import { useApiError } from "../../hooks/useApiError";
import { mimeFromName } from "../../lib/editor-utils";
import { renderPagesToPngBase64, printCurrentPageViaBrowser } from "../../lib/printing";
import type { PdfDocument } from "../../shared/types";

const API_BASE = getApiBaseUrl();

export default function EditorPage() {
    const te = useTranslations("editor");
    const { apiError } = useApiError();
    const { user } = useAuth();
    const { prefs } = usePreferences();
    const { status: syncStatus } = useCloudSync();
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
    const [mergeOpen, setMergeOpen] = React.useState(false);
    const [compressOpen, setCompressOpen] = React.useState(false);
    const [importExportOpen, setImportExportOpen] = React.useState(false);
    const [signOpen, setSignOpen] = React.useState(false);
    const [ocrOpen, setOcrOpen] = React.useState(false);
    const [printOptionsOpen, setPrintOptionsOpen] = React.useState(false);
    const [printPreview, setPrintPreview] = React.useState<{ dataUrl: string; isLandscape: boolean } | null>(null);
    const [annotateOpen, setAnnotateOpen] = React.useState(false);
    const [shareOpen, setShareOpen] = React.useState(false);
    const [openMenu, setOpenMenu] = React.useState<"organize" | "convert" | "annotate" | null>(null);
    const organizeRef = React.useRef<HTMLDivElement>(null);
    const convertRef = React.useRef<HTMLDivElement>(null);
    const annotateMenuRef = React.useRef<HTMLDivElement>(null);
    const [lockOpen, setLockOpen] = React.useState(false);
    const [replaceTextOpen, setReplaceTextOpen] = React.useState(false);
    const [renameId, setRenameId] = React.useState<string | null>(null);
    const [renameValue, setRenameValue] = React.useState("");
    const [pdfRefreshKey, setPdfRefreshKey] = React.useState(0);
    const pdfUrlRef = React.useRef<string | null>(null);
    const [multiSelect, setMultiSelect] = React.useState(false);
    const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

    // Shared by every modal that replaces the selected doc with an updated
    // version (remove pages, reorder, merge, lock/unlock, metadata, replace
    // text): swap it into `docs` in place, select it, and refresh the preview.
    // rename inline (lato sidebar): aggiorna metadata + lista locale (#881, T3)
    async function handleRenameCommit(doc: PdfDocument, newName: string) {
        try {
            await api.updateMetadata(doc.id, { new_filename: newName });
            setDocs((prev) => prev.map((d) => d.id === doc.id ? { ...d, original_filename: newName } : d));
        } catch { /* ignore */ }
    }

    // elimina il documento (delete confirm) — lato parent (#881, T6)
    async function handleDelete(id: string) {
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
    }

    const handleDocUpdated = React.useCallback((updatedDoc: PdfDocument) => {
        setDocs((prev) => {
            const oldId = selectedDoc?.id;
            if (oldId) return [updatedDoc, ...prev.filter((d) => d.id !== oldId)];
            return [updatedDoc, ...prev];
        });
        setSelectedDoc(updatedDoc);
        setPdfRefreshKey((k) => k + 1);
    }, [selectedDoc?.id]);

    async function handleDownload() {
        if (!selectedDoc) return;
        try {
            const blob = await api.downloadPdf(selectedDoc.id);
            const arrayBuf = await blob.arrayBuffer();
            const data = Array.from(new Uint8Array(arrayBuf));
            const saved = await tauriInvoke<string>("dialog_save", {
                defaultName: selectedDoc.original_filename,
                data,
                defaultFolder: prefs.default_save_folder || null,
            });
            if (saved) {
                console.log("PDF salvato in:", saved);
            }
        } catch (err) {
            console.error("Download failed:", err);
        }
    }

    function handlePrint() {
        if (!selectedDoc) return;
        const srcCanvas = document.querySelector("canvas");
        if (!srcCanvas) return;
        setPrintPreview({
            dataUrl: srcCanvas.toDataURL("image/png"),
            isLandscape: srcCanvas.width > srcCanvas.height,
        });
        setPrintOptionsOpen(true);
    }

    async function executePrint(options: PrintOptions) {
        setPrintOptionsOpen(false);
        if (!printPreview || !selectedDoc) return;

        // No printer chosen (browser/dev fallback, or the platform doesn't
        // support silent printing): fall back to the standard print flow,
        // limited to the currently visible page.
        if (!options.printerName) {
            await printCurrentPageViaBrowser(printPreview.dataUrl, printPreview.isLandscape, options);
            return;
        }

        try {
            const totalPages = selectedDoc.page_count || 1;
            const pageNumbers = parsePageRangeList(options.pageRange, totalPages);
            if (!pdfUrl) return;
            const { images, firstIsLandscape } = await renderPagesToPngBase64(pdfUrl, pageNumbers);
            if (images.length === 0) return;

            const pageOrientation =
                options.orientation === "auto" ? (firstIsLandscape ? "landscape" : "portrait") : options.orientation;
            const marginMm = options.margin === "none" ? 0 : 12;

            await tauriInvoke("print_pages", {
                request: {
                    printerName: options.printerName,
                    copies: options.copies,
                    color: options.color === "color",
                    orientation: pageOrientation,
                    marginMm,
                    images,
                },
            });
        } catch (err) {
            console.error("Print failed:", err);
        }
    }

    async function handleUploadFile(file: File) {
        const name = file.name.toLowerCase();
        const isPdf = name.endsWith(".pdf");
        const isImage = /\.(png|jpe?g|gif|bmp)$/.test(name);
        if (!isPdf && !isImage) return;
        setUploadError(null);
        try {
            const uploaded = isPdf ? await api.uploadPdf(file) : await api.importFile(file);
            setDocs((prev) => [uploaded, ...prev]);
            setSelectedDoc(uploaded);
        } catch (err) {
            const msg = apiError(err);
            console.error("Upload failed:", msg);
            setUploadError(msg);
        }
    }

    // ─── Multi-select batch ──────────────────────────────────────
    function toggleMultiSelect() {
        setMultiSelect((prev) => {
            if (prev) setSelectedIds(new Set());
            return !prev;
        });
    }

    function toggleSelect(id: string) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function toggleSelectAll() {
        if (selectedIds.size === docs.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(docs.map((d) => d.id)));
        }
    }

    function exitMultiSelect() {
        setMultiSelect(false);
        setSelectedIds(new Set());
    }

    async function handleBatchDelete() {
        if (selectedIds.size === 0) return;
        for (const id of selectedIds) {
            try {
                await api.deletePdf(id);
            } catch (err) {
                console.error("Batch delete failed for", id, err);
            }
        }
        setDocs((prev) => prev.filter((d) => !selectedIds.has(d.id)));
        if (selectedDoc && selectedIds.has(selectedDoc.id)) {
            setSelectedDoc(null);
            setPdfUrl(null);
        }
        exitMultiSelect();
    }

    async function handleBatchExport() {
        if (selectedIds.size === 0) return;
        for (const id of selectedIds) {
            const doc = docs.find((d) => d.id === id);
            if (!doc) continue;
            try {
                const blob = await api.downloadPdf(id);
                const arrayBuf = await blob.arrayBuffer();
                const data = Array.from(new Uint8Array(arrayBuf));
                await tauriInvoke<string>("dialog_save", {
                    defaultName: doc.original_filename,
                    data,
                    defaultFolder: prefs.default_save_folder || null,
                });
            } catch (err) {
                console.error("Batch export failed for", id, err);
            }
        }
        exitMultiSelect();
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
            // In Tauri, dataTransfer.files is NOT populated reliably (the
            // native onDragDropEvent handler below reads the file paths via
            // read_file_binary). Only use the standard drop handler on web.
            if (isTauri()) return;
            const file = e.dataTransfer?.files?.[0];
            if (file) handleUploadFile(file);
        }
        document.addEventListener("dragover", onDragOver);
        document.addEventListener("dragleave", onDragLeave);
        document.addEventListener("drop", onDrop);

        // In Tauri, dragging files from the OS does not populate
        // dataTransfer.files reliably. Use the native drag-drop event to get
        // the file paths, then read them via the read_file_binary IPC command.
        let unlistenDragDrop: (() => void) | undefined;
        if (isTauri()) {
            (async () => {
                try {
                    const { getCurrentWebview } = await import("@tauri-apps/api/webview");
                    unlistenDragDrop = await getCurrentWebview().onDragDropEvent((event) => {
                        if (event.payload.type === "drop") {
                            setDragOver(false);
                            const path = event.payload.paths?.[0];
                            if (path) handleDroppedPath(path);
                        } else if (event.payload.type === "over") {
                            setDragOver(true);
                        } else if (event.payload.type === "leave") {
                            setDragOver(false);
                        }
                    });
                } catch (err) {
                    console.error("Failed to register Tauri drag-drop:", err);
                }
            })();
        }

        return () => {
            document.removeEventListener("dragover", onDragOver);
            document.removeEventListener("dragleave", onDragLeave);
            document.removeEventListener("drop", onDrop);
            unlistenDragDrop?.();
        };
    }, []);

    // Read a dropped file path (Tauri) and upload it
    async function handleDroppedPath(filePath: string) {
        try {
            const raw = await tauriInvoke<number[]>("read_file_binary", { path: filePath });
            if (!raw) return;
            const name = filePath.split(/[/\\]/).pop() || "document.pdf";
            const isPdf = name.toLowerCase().endsWith(".pdf");
            const mime = isPdf ? "application/pdf" : mimeFromName(name);
            const blob = new Blob([new Uint8Array(raw)], { type: mime });
            const file = new File([blob], name, { type: mime });
            handleUploadFile(file);
        } catch (err) {
            console.error("Failed to read dropped file:", err);
        }
    }

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

    // Close toolbar dropdowns when clicking outside
    React.useEffect(() => {
        function onClickOutside(e: MouseEvent) {
            const target = e.target as Node;
            if (organizeRef.current && !organizeRef.current.contains(target)) {
                setOpenMenu((m) => (m === "organize" ? null : m));
            }
            if (convertRef.current && !convertRef.current.contains(target)) {
                setOpenMenu((m) => (m === "convert" ? null : m));
            }
            if (annotateMenuRef.current && !annotateMenuRef.current.contains(target)) {
                setOpenMenu((m) => (m === "annotate" ? null : m));
            }
        }
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, []);

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

    return (
        <div className="h-screen bg-[#17120f] text-[#f4f1ee] flex flex-col overflow-hidden">
            <div className="flex-1 grid grid-cols-[296px_1fr_292px] min-h-0">
                <EditorSidebar
                    te={te}
                    user={user}
                    docs={docs}
                    loading={loading}
                    selectedDoc={selectedDoc}
                    syncStatus={syncStatus}
                    multiSelect={multiSelect}
                    selectedIds={selectedIds}
                    renameId={renameId}
                    renameValue={renameValue}
                    uploadError={uploadError}
                    fileInputRef={fileInputRef}
                    onOpenLocal={handleOpenLocal}
                    onFileInputChange={handleFileInputChange}
                    onToggleMultiSelect={toggleMultiSelect}
                    onToggleSelectAll={toggleSelectAll}
                    onToggleSelect={toggleSelect}
                    onBatchDelete={handleBatchDelete}
                    onBatchExport={handleBatchExport}
                    onSelectDoc={setSelectedDoc}
                    onRenameIdChange={setRenameId}
                    onRenameValueChange={setRenameValue}
                    onRenameCommit={handleRenameCommit}
                    onDeleteRequest={setDeleteConfirm}
                />

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
                        onDownload={handleDownload}
                        onPrint={handlePrint}
                        onPageChange={setCurrentPage}
                        onZoomChange={setZoom}
                        onToggleMenu={(m) => setOpenMenu((prev) => (prev === m ? null : m))}
                        onMerge={() => { setMergeOpen(true); setOpenMenu(null); }}
                        onSplit={() => { setSplitOpen(true); setOpenMenu(null); }}
                        onReorder={() => { setReorderOpen(true); setOpenMenu(null); }}
                        onRemovePages={() => { setRemovePagesOpen(true); setOpenMenu(null); }}
                        onCompress={() => { setCompressOpen(true); setOpenMenu(null); }}
                        onImportExport={() => { setImportExportOpen(true); setOpenMenu(null); }}
                        onReplaceText={() => { setReplaceTextOpen(true); setOpenMenu(null); }}
                        onMetadata={() => { setMetadataOpen(true); setOpenMenu(null); }}
                        onSign={() => { setSignOpen(true); setOpenMenu(null); }}
                        onOcr={() => { setOcrOpen(true); setOpenMenu(null); }}
                        onAnnotate={() => { setAnnotateOpen(true); setOpenMenu(null); }}
                        onShare={() => setShareOpen(true)}
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
                                        <p className="text-base font-semibold text-white">{te("pdfLocked")}</p>
                                        <p className="mt-1 text-sm text-[#8d8175]">{te("pdfLockedDesc")}</p>
                                    </div>
                                    <button
                                        onClick={() => setLockOpen(true)}
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

                <EditorRightPanel
                    te={te}
                    selectedDoc={selectedDoc}
                    locked={!!selectedDoc?.is_password_protected}
                    onMerge={() => setMergeOpen(true)}
                    onSplit={() => setSplitOpen(true)}
                    onLock={() => setLockOpen(true)}
                    onOcr={() => setOcrOpen(true)}
                />
            </div>

            <RemovePagesModal
                open={removePagesOpen}
                pdfId={selectedDoc?.id ?? ""}
                pdfName={selectedDoc?.original_filename ?? ""}
                totalPages={selectedDoc?.page_count ?? 0}
                pdfUrl={pdfUrl}
                onClose={() => setRemovePagesOpen(false)}
                onSaved={handleDocUpdated}
            />

            <ReorderPagesModal
                open={reorderOpen}
                pdfId={selectedDoc?.id ?? ""}
                pdfName={selectedDoc?.original_filename ?? ""}
                totalPages={selectedDoc?.page_count ?? 0}
                pdfUrl={pdfUrl}
                onClose={() => setReorderOpen(false)}
                onSaved={handleDocUpdated}
            />

            <MergeModal
                open={mergeOpen}
                pdfId={selectedDoc?.id ?? ""}
                pdfName={selectedDoc?.original_filename ?? ""}
                onClose={() => setMergeOpen(false)}
                onSaved={handleDocUpdated}
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

            <CompressModal
                open={compressOpen}
                pdfId={selectedDoc?.id ?? ""}
                pdfName={selectedDoc?.original_filename ?? ""}
                onClose={() => setCompressOpen(false)}
                onSaved={(newDoc) => {
                    setDocs((prev) => [newDoc, ...prev]);
                    setSelectedDoc(newDoc);
                    setPdfRefreshKey((k) => k + 1);
                }}
            />

            <ImportExportModal
                open={importExportOpen}
                pdfId={selectedDoc?.id ?? ""}
                pdfName={selectedDoc?.original_filename ?? ""}
                onClose={() => setImportExportOpen(false)}
                onImported={(newDoc) => {
                    setDocs((prev) => [newDoc, ...prev]);
                    setSelectedDoc(newDoc);
                    setPdfRefreshKey((k) => k + 1);
                }}
            />

            <SignModal
                open={signOpen}
                pdfId={selectedDoc?.id ?? ""}
                pdfName={selectedDoc?.original_filename ?? ""}
                totalPages={selectedDoc?.page_count ?? 1}
                pdfUrl={pdfUrl}
                onClose={() => setSignOpen(false)}
                onSaved={(updatedDoc) => {
                    setDocs((prev) => prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d)));
                    setSelectedDoc(updatedDoc);
                    setPdfRefreshKey((k) => k + 1);
                }}
            />

            <OcrModal
                open={ocrOpen}
                pdfId={selectedDoc?.id ?? null}
                onClose={() => setOcrOpen(false)}
                onSuccess={() => setPdfRefreshKey((k) => k + 1)}
            />

            <PrintOptionsModal
                open={printOptionsOpen}
                onClose={() => setPrintOptionsOpen(false)}
                onConfirm={executePrint}
                pdfUrl={pdfUrl}
                initialPage={currentPage}
                totalPages={selectedDoc?.page_count ?? 1}
            />

            <AnnotationDialog
                open={annotateOpen}
                pdfId={selectedDoc?.id ?? null}
                currentPage={currentPage}
                pdfUrl={pdfUrl}
                onClose={() => setAnnotateOpen(false)}
                onSuccess={() => setPdfRefreshKey((k) => k + 1)}
            />

            <ShareDialog
                open={shareOpen}
                pdfId={selectedDoc?.id ?? null}
                onClose={() => setShareOpen(false)}
            />

            <LockUnlockModal
                open={lockOpen}
                pdfId={selectedDoc?.id ?? ""}
                pdfName={selectedDoc?.original_filename ?? ""}
                isProtected={selectedDoc?.is_password_protected ?? false}
                onClose={() => setLockOpen(false)}
                onSaved={handleDocUpdated}
            />

            <MetadataModal
                open={metadataOpen}
                pdfId={selectedDoc?.id ?? ""}
                pdfName={selectedDoc?.original_filename ?? ""}
                onClose={() => setMetadataOpen(false)}
                onSaved={handleDocUpdated}
            />

            <ReplaceTextModal
                open={replaceTextOpen}
                onClose={() => setReplaceTextOpen(false)}
                pdfId={selectedDoc?.id ?? null}
                onSuccess={handleDocUpdated}
            />

            {/* Delete confirmation dialog */}
            <DeleteConfirmModal
                te={te}
                deleteConfirmId={deleteConfirm}
                onCancel={() => setDeleteConfirm(null)}
                onConfirm={handleDelete}
            />

            <EditorFooter te={te} apiBase={API_BASE} />
        </div>
    );
}
