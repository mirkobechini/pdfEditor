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
    try {
      const doc = await api.getPdf(id);
      setSelectedName(doc.original_filename);
      const blob = await api.downloadPdf(id);
      const url = URL.createObjectURL(blob);
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      setFileUrl(url);
    } catch (err) {
      console.error("Failed to load PDF:", err);
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
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
        setFileUrl(null);
      }
      setCurrentPage(1);
      setTotalPages(0);
    }
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
            onRename={() => {}}
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
            onReplaceText={() => {}}
          />
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
    </>
  );
}
