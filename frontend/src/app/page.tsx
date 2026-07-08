"use client";

import React from "react";
import LandingNavbar from "./components/landing/LandingNavbar";
import LandingHero from "./components/landing/LandingHero";
import LandingFeatures from "./components/landing/LandingFeatures";
import LandingHowItWorks from "./components/landing/LandingHowItWorks";
import LandingPricing from "./components/landing/LandingPricing";
import LandingCTA from "./components/landing/LandingCTA";
import LandingFooter from "./components/landing/LandingFooter";
import { useAuth } from "./lib/auth";

export default function Home() {
  const { user, loading } = useAuth();

  React.useEffect(() => {
    // If user is authenticated, redirect to editor
    if (!loading && user) {
      window.location.href = "/app";
    }
  }, [loading, user]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
      <LandingNavbar logo={{ src: "/orange-monkey_logo.png", alt: "PdfEditor Logo" }} />
      <main className="pt-16">
        <LandingHero />
        <LandingFeatures />
        <LandingHowItWorks />
        {/* <LandingPricing /> */}
        <LandingCTA />
      </main>
      <LandingFooter />
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
          onMetadata={() => setMetadataOpen(true)}
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
