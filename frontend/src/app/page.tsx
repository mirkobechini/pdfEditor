"use client";

import React from "react";
import AppLayout from "./components/AppLayout";
import Sidebar from "./components/Sidebar";
import Toolbar from "./components/Toolbar";
import PdfViewer from "./components/PdfViewer";
import MergeDialog from "./components/MergeDialog";
import { api, PdfDocument } from "./lib/api";

export default function Home() {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [fileUrl, setFileUrl] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(0);
  const [zoom, setZoom] = React.useState(1);
  const [mergeOpen, setMergeOpen] = React.useState(false);

  async function handleSelect(id: string) {
    if (id === selectedId) return;
    setSelectedId(id);
    try {
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
  }

  function handleDelete(id: string) {
    if (selectedId === id) {
      setSelectedId(null);
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
            onSplit={() => {}}
            onReorder={() => {}}
            onRemovePages={() => {}}
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
          />
        }
      />
      <MergeDialog
        open={mergeOpen}
        onClose={() => setMergeOpen(false)}
        onMergeComplete={(doc) => {
          setSelectedId(doc.id);
        }}
      />
    </>
  );
}
