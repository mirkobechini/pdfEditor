"use client";

import React from "react";
import AppLayout from "../components/AppLayout";
import Sidebar from "../components/Sidebar";
import Toolbar from "../components/Toolbar";
import PdfViewer from "../components/PdfViewer";
import MergeDialog from "../components/MergeDialog";
import SplitDialog from "../components/SplitDialog";
import ReorderDialog from "../components/ReorderDialog";
import RemoveDialog from "../components/RemoveDialog";
import MetadataDialog from "../components/MetadataDialog";
import ReplaceTextDialog from "../components/ReplaceTextDialog";
import ProtectDialog from "../components/ProtectDialog";
import DeleteModal from "../components/DeleteModal";
import { api, PdfDocument } from "../lib/api";
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
    const [reorderOpen, setReorderOpen] = React.useState(false);
    const [removeOpen, setRemoveOpen] = React.useState(false);
    const [metadataOpen, setMetadataOpen] = React.useState(false);
    const [replaceTextOpen, setReplaceTextOpen] = React.useState(false);
    const [protectOpen, setProtectOpen] = React.useState(false);
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

    async function handleMerge(ids: string[]) {
        try {
            const merged = await api.mergePdfs(ids);
            setSidebarRefreshKey((prev) => prev + 1);
            setSelectedId(merged.id);
            const blob = await api.downloadPdf(merged.id);
            const url = URL.createObjectURL(blob);
            if (fileUrl) URL.revokeObjectURL(fileUrl);
            setFileUrl(url);
            setMergeOpen(false);
        } catch (err) {
            console.error("Merge failed:", err);
        }
    }

    async function handleSplit(id: string, pages: number[]) {
        try {
            // Convert pages array to ranges string format expected by API
            const ranges = pages.length > 0 ? [pages.map(String).join("-")] : [];
            const split = await api.splitPdf(id, "range", ranges);
            setSidebarRefreshKey((prev) => prev + 1);
            setSelectedId(split.items?.[0]?.id || id);
            const blob = await api.downloadPdf(split.items?.[0]?.id || id);
            const url = URL.createObjectURL(blob);
            if (fileUrl) URL.revokeObjectURL(fileUrl);
            setFileUrl(url);
            setSplitOpen(false);
        } catch (err) {
            console.error("Split failed:", err);
        }
    }

    async function handleReorder(id: string, order: number[]) {
        try {
            await api.reorderPages(id, order);
            const blob = await api.downloadPdf(id);
            const url = URL.createObjectURL(blob);
            if (fileUrl) URL.revokeObjectURL(fileUrl);
            setFileUrl(url);
            setReorderOpen(false);
        } catch (err) {
            console.error("Reorder failed:", err);
        }
    }

    async function handleRemove(id: string, pages: number[]) {
        try {
            await api.removePages(id, pages);
            const blob = await api.downloadPdf(id);
            const url = URL.createObjectURL(blob);
            if (fileUrl) URL.revokeObjectURL(fileUrl);
            setFileUrl(url);
            setRemoveOpen(false);
        } catch (err) {
            console.error("Remove failed:", err);
        }
    }

    async function handleMetadata(id: string, data: Record<string, string>) {
        try {
            await api.updateMetadata(id, data);
        } catch (err) {
            console.error("Metadata update failed:", err);
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

    return (
        <>
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
                        onReorder={() => setReorderOpen(true)}
                        onRemovePages={() => setRemoveOpen(true)}
                        onReplaceText={() => setReplaceTextOpen(true)}
                        onMetadata={() => setMetadataOpen(true)}
                        onProtect={() => setProtectOpen(true)}
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
            />
            <ProtectDialog
                open={protectOpen}
                onClose={() => setProtectOpen(false)}
                pdfId={selectedId}
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
        </>
    );
}
