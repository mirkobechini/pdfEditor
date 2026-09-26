"use client";

import React from "react";
import AppLayout from "../components/AppLayout";
import Sidebar from "../components/Sidebar";
import Toolbar from "../components/Toolbar";
import PdfViewer from "../components/PdfViewer";
import MergeDialog from "../components/MergeDialog";
import SplitDialog from "../components/SplitDialog";
import CompressDialog from "../components/CompressDialog";
import ReorderDialog from "../components/ReorderDialog";
import RemoveDialog from "../components/RemoveDialog";
import MetadataDialog from "../components/MetadataDialog";
import ReplaceTextDialog from "../components/ReplaceTextDialog";
import ProtectDialog from "../components/ProtectDialog";
import SignDialog from "../components/SignDialog";
import ShareDialog from "../components/ShareDialog";
import AnnotationDialog from "../components/AnnotationDialog";
import OcrModal from "../components/OcrModal";
import DeleteModal from "../components/DeleteModal";
import ImportExportDialog from "../components/ImportExportDialog";
import DropOverlay from "../components/DropOverlay";
import { api, PdfDocument } from "../lib/api";
import { mapError } from "../lib/error-map";
import { downloadBlob } from "../lib/download";
import { useAuth } from "../lib/auth";

export default function EditorPage() {
    const { user, loading } = useAuth();
    const [selectedId, setSelectedId] = React.useState<string | null>(null);
    const [selectedName, setSelectedName] = React.useState("");
    const [fileUrl, setFileUrl] = React.useState<string | null>(null);
    const [currentPage, setCurrentPage] = React.useState(1);
    const [totalPages, setTotalPages] = React.useState(0);
    const [zoom, setZoom] = React.useState(1);
    const [mergeOpen, setMergeOpen] = React.useState(false);
    const [splitOpen, setSplitOpen] = React.useState(false);
    const [compressOpen, setCompressOpen] = React.useState(false);
    const [reorderOpen, setReorderOpen] = React.useState(false);
    const [removeOpen, setRemoveOpen] = React.useState(false);
    const [metadataOpen, setMetadataOpen] = React.useState(false);
    const [replaceTextOpen, setReplaceTextOpen] = React.useState(false);
    const [protectOpen, setProtectOpen] = React.useState(false);
    const [signOpen, setSignOpen] = React.useState(false);
    const [shareOpen, setShareOpen] = React.useState(false);
    const [annotateOpen, setAnnotateOpen] = React.useState(false);
    const [ocrOpen, setOcrOpen] = React.useState(false);
    const [dragOver, setDragOver] = React.useState(false);
    const [importExportOpen, setImportExportOpen] = React.useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
    const [fileToDelete, setFileToDelete] = React.useState<PdfDocument | null>(null);
    const [sidebarRefreshKey, setSidebarRefreshKey] = React.useState(0);
    const [requiresPassword, setRequiresPassword] = React.useState(false);
    const [passwordError, setPasswordError] = React.useState<string | null>(null);
    const fileUrlRef = React.useRef<string | null>(null);

    React.useEffect(() => {
        if (!loading && !user) {
            window.location.href = "/login";
        }
    }, [loading, user]);

    // Keep ref in sync with fileUrl for cleanup on unmount
    React.useEffect(() => {
        fileUrlRef.current = fileUrl;
    }, [fileUrl]);

    // Revoke blob URL on unmount to prevent memory leak
    React.useEffect(() => {
        return () => {
            if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
        };
    }, []);

    if (loading || !user) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <p className="text-gray-500 dark:text-gray-400">Loading...</p>
            </div>
        );
    }

    async function handleSelect(id: string) {
        if (id === selectedId) return;
        setSelectedId(id);
        setPasswordError(null);
        try {
            const doc = await api.getPdf(id);
            setSelectedName(doc.original_filename);

            if (doc.is_password_protected) {
                setRequiresPassword(true);
                setFileUrl(null);
                return;
            }

            setRequiresPassword(false);
            const blob = await api.downloadPdf(id);
            const url = URL.createObjectURL(blob);
            if (fileUrl) URL.revokeObjectURL(fileUrl);
            setFileUrl(url);
        } catch (err) {
            console.error("Failed to load PDF:", err);
        }
    }

    async function handleUnlock(password: string) {
        if (!selectedId) return;
        setPasswordError(null);
        try {
            await api.unlockPdf(selectedId, password);
            setRequiresPassword(false);
            // Now download the unlocked PDF
            const blob = await api.downloadPdf(selectedId);
            const url = URL.createObjectURL(blob);
            if (fileUrl) URL.revokeObjectURL(fileUrl);
            setFileUrl(url);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Incorrect password";
            setPasswordError(message);
        }
    }

    async function handleUndo() {
        if (!selectedId) return;
        try {
            const doc = await api.undoPdf(selectedId);
            // Reload the restored PDF
            const blob = await api.downloadPdf(doc.id);
            const url = URL.createObjectURL(blob);
            if (fileUrl) URL.revokeObjectURL(fileUrl);
            setFileUrl(url);
            setSelectedId(doc.id);
        } catch (err) {
            console.error("Failed to undo:", err);
        }
    }

    async function handleDelete(doc: PdfDocument) {
        await api.deletePdf(doc.id);
        if (selectedId === doc.id) {
            setSelectedId(null);
            setFileUrl(null);
        }
        setSidebarRefreshKey((prev) => prev + 1);
        setDeleteModalOpen(false);
        setFileToDelete(null);
    }

    async function handleBatchDelete(ids: string[]) {
        for (const id of ids) {
            try {
                await api.deletePdf(id);
            } catch (err) {
                console.error("Batch delete failed for", id, err);
            }
        }
        if (selectedId && ids.includes(selectedId)) {
            setSelectedId(null);
            setFileUrl(null);
        }
        setSidebarRefreshKey((prev) => prev + 1);
    }

    async function handleBatchExport(ids: string[]) {
        for (const id of ids) {
            try {
                const blob = await api.downloadPdf(id);
                const name = `pdf_${id}.pdf`;
                downloadBlob(blob, name);
            } catch (err) {
                console.error("Batch export failed for", id, err);
            }
        }
    }

    function handlePrint() {
        if (!fileUrl) return;
        // Open the PDF in a hidden iframe and trigger the browser print dialog.
        // This prints the actual PDF (not the page) via the browser's native print.
        const iframe = document.createElement("iframe");
        iframe.src = fileUrl;
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "none";
        iframe.style.visibility = "hidden";
        iframe.onload = () => {
            try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
            } catch (err) {
                console.error("Print failed:", err);
            }
        };
        document.body.appendChild(iframe);
        // Clean up after a delay to allow the print dialog to open
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 60000);
    }

    // Shared by handleDrop and SignDialog.onSuccess: point the viewer at a
    // freshly created/updated doc and refresh its content from the server.
    function loadDocIntoViewer(doc: { id: string; original_filename: string }) {
        setSidebarRefreshKey((prev) => prev + 1);
        setSelectedId(doc.id);
        setSelectedName(doc.original_filename);
        void api.downloadPdf(doc.id).then((blob) => {
            const url = URL.createObjectURL(blob);
            if (fileUrl) URL.revokeObjectURL(fileUrl);
            setFileUrl(url);
        });
    }

    async function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (!file) return;

        const isPdf = file.name.toLowerCase().endsWith(".pdf");
        const isImportable = /\.(txt|png|jpg|jpeg|gif|bmp|docx)$/i.test(file.name);

        try {
            let doc: PdfDocument;
            if (isPdf) {
                doc = await api.uploadPdf(file);
            } else if (isImportable) {
                doc = await api.importFile(file);
            } else {
                alert("Unsupported file type. Drop a PDF, image, text or DOCX file.");
                return;
            }
            loadDocIntoViewer(doc);
            setRequiresPassword(false);
        } catch (err) {
            alert("Upload failed: " + mapError(err));
        }
    }

    return (
        <div
            data-testid="editor-drop-zone"
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
        >
            <DropOverlay visible={dragOver} />
            <AppLayout
                sidebar={
                    <Sidebar
                        selectedId={selectedId}
                        onSelect={handleSelect}
                        onUpload={(doc) => {
                            setSidebarRefreshKey((prev) => prev + 1);
                            setSelectedId(doc.id);
                        }}
                        onDeleteClick={(doc) => {
                            setFileToDelete(doc);
                            setDeleteModalOpen(true);
                        }}
                        onBatchDelete={handleBatchDelete}
                        onBatchExport={handleBatchExport}
                        refreshKey={sidebarRefreshKey}
                    />
                }
                toolbar={
                    <Toolbar
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        zoom={zoom}
                        onZoomChange={setZoom}
                        onMerge={() => setMergeOpen(true)}
                        onSplit={() => setSplitOpen(true)}
                        onCompress={() => setCompressOpen(true)}
                        onReorder={() => setReorderOpen(true)}
                        onRemovePages={() => setRemoveOpen(true)}
                        onReplaceText={() => setReplaceTextOpen(true)}
                        onMetadata={() => setMetadataOpen(true)}
                        onProtect={() => setProtectOpen(true)}
                        onImportExport={() => setImportExportOpen(true)}
                        onPrint={handlePrint}
                        onSign={() => setSignOpen(true)}
                        onShare={() => setShareOpen(true)}
                        onAnnotate={() => setAnnotateOpen(true)}
                        onOcr={() => setOcrOpen(true)}
                        canUndo={!!selectedId}
                        canRedo={false}
                        onUndo={handleUndo}
                        onRedo={() => { }}
                    />
                }
                viewer={
                    <PdfViewer
                        fileUrl={fileUrl}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        requiresPassword={requiresPassword}
                        passwordError={passwordError}
                        onUnlock={handleUnlock}
                        zoom={zoom}
                        onZoomChange={setZoom}
                        onPageChange={setCurrentPage}
                        onTotalPagesChange={setTotalPages}
                    />
                }
            />

            {/* Dialogs */}
            <MergeDialog
                open={mergeOpen}
                onClose={() => setMergeOpen(false)}
                selectedId={selectedId}
                onMergeComplete={(doc) => {
                    setSidebarRefreshKey((prev) => prev + 1);
                    setSelectedId(doc.id);
                    setSelectedName(doc.original_filename);
                    if (doc.is_password_protected) {
                        setRequiresPassword(true);
                        setFileUrl(null);
                        return;
                    }
                    setRequiresPassword(false);
                    void api.downloadPdf(doc.id).then((blob) => {
                        const url = URL.createObjectURL(blob);
                        if (fileUrl) URL.revokeObjectURL(fileUrl);
                        setFileUrl(url);
                    });
                }}
            />
            <SplitDialog
                open={splitOpen}
                onClose={() => setSplitOpen(false)}
                selectedId={selectedId}
                selectedName={selectedName}
                totalPages={totalPages}
                onSuccess={() => setSidebarRefreshKey((prev) => prev + 1)}
            />
            <CompressDialog
                open={compressOpen}
                onClose={() => setCompressOpen(false)}
                selectedId={selectedId}
                selectedName={selectedName}
                onSuccess={() => setSidebarRefreshKey((prev) => prev + 1)}
            />
            <ReorderDialog
                open={reorderOpen}
                onClose={() => setReorderOpen(false)}
                selectedId={selectedId}
                selectedName={selectedName}
                totalPages={totalPages}
                onSuccess={() => setSidebarRefreshKey((prev) => prev + 1)}
            />
            <RemoveDialog
                open={removeOpen}
                onClose={() => setRemoveOpen(false)}
                selectedId={selectedId}
                selectedName={selectedName}
                totalPages={totalPages}
                onSuccess={() => setSidebarRefreshKey((prev) => prev + 1)}
            />
            <MetadataDialog
                open={metadataOpen}
                onClose={() => setMetadataOpen(false)}
                pdfId={selectedId}
                onSuccess={(doc) => {
                    setSidebarRefreshKey((prev) => prev + 1);
                    setSelectedId(doc.id);
                    setSelectedName(doc.original_filename);
                    if (doc.is_password_protected) {
                        setRequiresPassword(true);
                        setFileUrl(null);
                        return;
                    }
                    setRequiresPassword(false);
                    void api.downloadPdf(doc.id).then((blob) => {
                        const url = URL.createObjectURL(blob);
                        if (fileUrl) URL.revokeObjectURL(fileUrl);
                        setFileUrl(url);
                    });
                }}
            />
            <ReplaceTextDialog
                open={replaceTextOpen}
                onClose={() => setReplaceTextOpen(false)}
                pdfId={selectedId}
                onSuccess={loadDocIntoViewer}
            />
            <ProtectDialog
                open={protectOpen}
                onClose={() => setProtectOpen(false)}
                pdfId={selectedId}
            />
            <SignDialog
                open={signOpen}
                onClose={() => setSignOpen(false)}
                pdfId={selectedId}
                totalPages={totalPages}
                onSuccess={loadDocIntoViewer}
            />
            <ShareDialog
                open={shareOpen}
                onClose={() => setShareOpen(false)}
                pdfId={selectedId}
            />
            <AnnotationDialog
                open={annotateOpen}
                onClose={() => setAnnotateOpen(false)}
                pdfId={selectedId}
                currentPage={currentPage}
                onSuccess={() => setSidebarRefreshKey((prev) => prev + 1)}
            />
            <OcrModal
                open={ocrOpen}
                onClose={() => setOcrOpen(false)}
                pdfId={selectedId}
                onSuccess={() => setSidebarRefreshKey((prev) => prev + 1)}
            />
            <ImportExportDialog
                open={importExportOpen}
                onClose={() => setImportExportOpen(false)}
                selectedId={selectedId}
                selectedName={selectedName}
                onImportSuccess={(doc) => {
                    setSidebarRefreshKey((prev) => prev + 1);
                    setSelectedId(doc.id);
                    setSelectedName(doc.original_filename);
                    setRequiresPassword(false);
                    void api.downloadPdf(doc.id).then((blob) => {
                        const url = URL.createObjectURL(blob);
                        if (fileUrl) URL.revokeObjectURL(fileUrl);
                        setFileUrl(url);
                    });
                }}
            />
            <DeleteModal
                open={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                file={fileToDelete}
                onConfirm={() => {
                    if (!fileToDelete) return;
                    void handleDelete(fileToDelete);
                }}
            />
        </div>
    );
}
