"use client";

import React from "react";
import AppLayout from "./components/AppLayout";
import Sidebar from "./components/Sidebar";
import Toolbar from "./components/Toolbar";
import PdfViewer from "./components/PdfViewer";
import MergeDialog from "./components/MergeDialog";
import SplitDialog from "./components/SplitDialog";
import ReorderDialog from "./components/ReorderDialog";
import RemoveDialog from "./components/RemoveDialog";
import DeleteModal from "./components/DeleteModal";
import { api, PdfDocument } from "./lib/api";
import { useAuth } from "./lib/auth";

export default function Home() {
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
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [fileToDelete, setFileToDelete] = React.useState<PdfDocument | null>(null);
  const [sidebarRefreshKey, setSidebarRefreshKey] = React.useState(0);
  const [requiresPassword, setRequiresPassword] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!loading && !user) {
      window.location.href = "/login";
    }
  }, [loading, user]);

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
      setSelectedName(doc.original_filename);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "Nothing to undo") return; // silent: no snapshots available
      console.error("Undo failed:", err);
    }
  }

  async function handleRedo() {
    if (!selectedId) return;
    try {
      const doc = await api.redoPdf(selectedId);
      const blob = await api.downloadPdf(doc.id);
      const url = URL.createObjectURL(blob);
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      setFileUrl(url);
      setSelectedId(doc.id);
      setSelectedName(doc.original_filename);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "Nothing to redo") return; // silent: no redo available
      console.error("Redo failed:", err);
    }
  }

  function handleUpload(doc: PdfDocument) {
    setSelectedId(doc.id);
    setSelectedName(doc.original_filename);
  }

  function handleDelete(id: string) {
    if (selectedId === id) {
      setSelectedId(null);
      setSelectedName("");
      setRequiresPassword(false);
      setPasswordError(null);
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
        setFileUrl(null);
      }
      setCurrentPage(1);
      setTotalPages(0);
    }
  }

  function handleDeleteClick(file: PdfDocument) {
    setFileToDelete(file);
    setDeleteModalOpen(true);
  }

  function handleDeleteModalClose() {
    setDeleteModalOpen(false);
    setFileToDelete(null);
  }

  function handleDeleteConfirm() {
    // Called after DeleteModal successfully deletes the PDF via api.deletePdf()
    handleDelete(fileToDelete?.id || "");
    setSidebarRefreshKey((k) => k + 1);
    handleDeleteModalClose();
  }

  return (
    <>
      <AppLayout
        sidebar={
          <Sidebar
            selectedId={selectedId}
            onSelect={handleSelect}
            onUpload={handleUpload}
            onDelete={handleDelete}
            onRename={() => { }}
            onDeleteClick={handleDeleteClick}
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
            onReplaceText={() => { }} canUndo={!!selectedId}
            canRedo={!!selectedId}
            onUndo={handleUndo}
            onRedo={handleRedo} />
        }
        viewer={
          <PdfViewer
            fileUrl={fileUrl}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onTotalPagesChange={setTotalPages}
            zoom={zoom}
            onZoomChange={setZoom}
            requiresPassword={requiresPassword}
            passwordError={passwordError}
            onUnlock={handleUnlock}
            onFileDrop={async (file) => {
              try {
                const doc = await api.uploadPdf(file);
                handleUpload(doc);
                handleSelect(doc.id);
              } catch (err) {
                alert("Upload failed: " + err);
              }
            }}
          />
        }
      />
      <MergeDialog
        open={mergeOpen}
        onClose={() => setMergeOpen(false)}
        selectedId={selectedId}
        onMergeComplete={(doc) => {
          setSelectedId(doc.id);
          setSelectedName(doc.original_filename);
        }}
      />
      <SplitDialog
        open={splitOpen}
        onClose={() => setSplitOpen(false)}
        selectedId={selectedId}
        selectedName={selectedName}
        totalPages={totalPages}
      />
      <ReorderDialog
        open={reorderOpen}
        onClose={() => setReorderOpen(false)}
        selectedId={selectedId}
        selectedName={selectedName}
        totalPages={totalPages}
      />
      <RemoveDialog
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        selectedId={selectedId}
        selectedName={selectedName}
        totalPages={totalPages}
      />
      <DeleteModal
        open={deleteModalOpen}
        onClose={handleDeleteModalClose}
        file={fileToDelete}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
