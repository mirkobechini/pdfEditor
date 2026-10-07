"use client";

// Tutto lo stato dell'editor desktop e i relativi handler/effetti,
// estratto da app/app/page.tsx (issue #881, T8). Il componente page.tsx
// resta presentazionale: chiama questo hook e passa i valori ai figli.
// Centralizza in un unico posto: upload/download, multi-select batch,
// print, drag-and-drop, caricamento documenti e refresh del preview PDF.
//
// Gli stati di apertura dei dialog/modal, le operazioni multi-select e la
// logica di stampa sono estratti in useEditorDialogs / useEditorMultiSelect /
// useEditorPrint per mantenere questo file sotto le 400 righe (file lunghi,
// refactor/long-files-t6-desktophooks).

import React from "react";
import { api } from "../shared/api";
import { isTauri, tauriInvoke } from "../shared/tauri";
import { usePreferences } from "../lib/preferences";
import { useApiError } from "./useApiError";
import { mimeFromName } from "../lib/editor-utils";
import type { PdfDocument } from "../shared/types";
import { useEditorDialogs } from "./useEditorDialogs";
import { useEditorMultiSelect } from "./useEditorMultiSelect";
import { useEditorPrint } from "./useEditorPrint";

export function useEditorState() {
    const { apiError } = useApiError();
    const { prefs } = usePreferences();

    const {
        metadataOpen, setMetadataOpen,
        deleteConfirm, setDeleteConfirm,
        removePagesOpen, setRemovePagesOpen,
        reorderOpen, setReorderOpen,
        splitOpen, setSplitOpen,
        mergeOpen, setMergeOpen,
        compressOpen, setCompressOpen,
        importExportOpen, setImportExportOpen,
        signOpen, setSignOpen,
        ocrOpen, setOcrOpen,
        printOptionsOpen, setPrintOptionsOpen,
        printPreview, setPrintPreview,
        annotateOpen, setAnnotateOpen,
        shareOpen, setShareOpen,
        lockOpen, setLockOpen,
        replaceTextOpen, setReplaceTextOpen,
    } = useEditorDialogs();

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
    const [openMenu, setOpenMenu] = React.useState<"organize" | "convert" | "annotate" | null>(null);
    const organizeRef = React.useRef<HTMLDivElement>(null);
    const convertRef = React.useRef<HTMLDivElement>(null);
    const annotateMenuRef = React.useRef<HTMLDivElement>(null);
    const [renameId, setRenameId] = React.useState<string | null>(null);
    const [renameValue, setRenameValue] = React.useState("");
    const [pdfRefreshKey, setPdfRefreshKey] = React.useState(0);

    const {
        multiSelect, selectedIds,
        toggleMultiSelect, toggleSelect, toggleSelectAll,
        handleBatchDelete, handleBatchExport,
    } = useEditorMultiSelect({
        docs, setDocs, selectedDoc, setSelectedDoc, setPdfUrl,
        defaultSaveFolder: prefs.default_save_folder || null,
    });

    const {
        handlePrint,
        executePrint,
    } = useEditorPrint({
        selectedDoc, pdfUrl, printPreview, setPrintPreview, setPrintOptionsOpen,
    });

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

    return {
        docs, setDocs,
        loading,
        selectedDoc, setSelectedDoc,
        pdfUrl,
        currentPage, setCurrentPage,
        totalPages, setTotalPages,
        zoom, setZoom,
        fileInputRef,
        dragOver, uploadError,
        metadataOpen, setMetadataOpen,
        deleteConfirm, setDeleteConfirm,
        removePagesOpen, setRemovePagesOpen,
        reorderOpen, setReorderOpen,
        splitOpen, setSplitOpen,
        mergeOpen, setMergeOpen,
        compressOpen, setCompressOpen,
        importExportOpen, setImportExportOpen,
        signOpen, setSignOpen,
        ocrOpen, setOcrOpen,
        printOptionsOpen, setPrintOptionsOpen,
        annotateOpen, setAnnotateOpen,
        shareOpen, setShareOpen,
        openMenu, setOpenMenu,
        organizeRef, convertRef, annotateMenuRef,
        lockOpen, setLockOpen,
        replaceTextOpen, setReplaceTextOpen,
        renameId, setRenameId,
        renameValue, setRenameValue,
        pdfRefreshKey, setPdfRefreshKey,
        multiSelect, selectedIds,
        handleRenameCommit,
        handleDelete,
        handleDocUpdated,
        handleDownload,
        handlePrint,
        executePrint,
        handleOpenLocal,
        handleFileInputChange,
        toggleMultiSelect,
        toggleSelect,
        toggleSelectAll,
        handleBatchDelete,
        handleBatchExport,
    };
}