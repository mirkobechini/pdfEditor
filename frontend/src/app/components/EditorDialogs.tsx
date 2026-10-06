"use client";

import React from "react";
import MergeDialog from "./MergeDialog";
import SplitDialog from "./SplitDialog";
import CompressDialog from "./CompressDialog";
import ReorderDialog from "./ReorderDialog";
import RemoveDialog from "./RemoveDialog";
import MetadataDialog from "./MetadataDialog";
import ReplaceTextDialog from "./ReplaceTextDialog";
import ProtectDialog from "./ProtectDialog";
import PrintOptionsModal, { type PrintOptions } from "./PrintOptionsModal";
import SignDialog from "./SignDialog";
import ShareDialog from "./ShareDialog";
import AnnotationDialog from "./AnnotationDialog";
import OcrModal from "./OcrModal";
import ImportExportDialog from "./ImportExportDialog";
import DeleteModal from "./DeleteModal";
import { api, PdfDocument } from "../lib/api";

export interface EditorDialogsProps {
  selectedId: string | null;
  selectedName: string;
  fileUrl: string | null;
  currentPage: number;
  totalPages: number;
  // open/close state for each dialog
  mergeOpen: boolean;
  splitOpen: boolean;
  compressOpen: boolean;
  reorderOpen: boolean;
  removeOpen: boolean;
  metadataOpen: boolean;
  replaceTextOpen: boolean;
  protectOpen: boolean;
  signOpen: boolean;
  shareOpen: boolean;
  annotateOpen: boolean;
  ocrOpen: boolean;
  importExportOpen: boolean;
  printOptionsOpen: boolean;
  deleteModalOpen: boolean;
  fileToDelete: PdfDocument | null;
  // setters passed from the page (state lives in the parent)
  onCloseMerge: () => void;
  onCloseSplit: () => void;
  onCloseCompress: () => void;
  onCloseReorder: () => void;
  onCloseRemove: () => void;
  onCloseMetadata: () => void;
  onCloseReplaceText: () => void;
  onCloseProtect: () => void;
  onCloseSign: () => void;
  onCloseShare: () => void;
  onCloseAnnotate: () => void;
  onCloseOcr: () => void;
  onCloseImportExport: () => void;
  onClosePrintOptions: () => void;
  onCloseDeleteModal: () => void;
  onConfirmDelete: () => void;
  // shared mutation callbacks
  setSelectedId: (id: string | null) => void;
  setSelectedName: (name: string) => void;
  setFileUrl: (url: string | null) => void;
  setRequiresPassword: (v: boolean) => void;
  setSidebarRefreshKey: (fn: (prev: number) => number) => void;
  loadDocIntoViewer: (doc: { id: string; original_filename: string }) => void;
  executePrint: (options: PrintOptions) => void;
}

/** All modal dialogs of the editor (extracted from page.tsx — issue A6/long files). */
export default function EditorDialogs(p: EditorDialogsProps) {
  const {
    selectedId, selectedName, fileUrl, currentPage, totalPages,
    mergeOpen, splitOpen, compressOpen, reorderOpen, removeOpen,
    metadataOpen, replaceTextOpen, protectOpen, signOpen, shareOpen,
    annotateOpen, ocrOpen, importExportOpen, printOptionsOpen,
    deleteModalOpen, fileToDelete,
    onCloseMerge, onCloseSplit, onCloseCompress, onCloseReorder,
    onCloseRemove, onCloseMetadata, onCloseReplaceText, onCloseProtect,
    onCloseSign, onCloseShare, onCloseAnnotate, onCloseOcr,
    onCloseImportExport, onClosePrintOptions, onCloseDeleteModal,
    onConfirmDelete, setSelectedId, setSelectedName, setFileUrl,
    setRequiresPassword, setSidebarRefreshKey, loadDocIntoViewer, executePrint,
  } = p;

  return (
    <>
      <MergeDialog
        open={mergeOpen}
        onClose={onCloseMerge}
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
        onClose={onCloseSplit}
        selectedId={selectedId}
        selectedName={selectedName}
        totalPages={totalPages}
        onSuccess={() => setSidebarRefreshKey((prev) => prev + 1)}
      />
      <CompressDialog
        open={compressOpen}
        onClose={onCloseCompress}
        selectedId={selectedId}
        selectedName={selectedName}
        onSuccess={() => setSidebarRefreshKey((prev) => prev + 1)}
      />
      <ReorderDialog
        open={reorderOpen}
        onClose={onCloseReorder}
        selectedId={selectedId}
        selectedName={selectedName}
        totalPages={totalPages}
        onSuccess={() => setSidebarRefreshKey((prev) => prev + 1)}
      />
      <RemoveDialog
        open={removeOpen}
        onClose={onCloseRemove}
        selectedId={selectedId}
        selectedName={selectedName}
        totalPages={totalPages}
        onSuccess={() => setSidebarRefreshKey((prev) => prev + 1)}
      />
      <MetadataDialog
        open={metadataOpen}
        onClose={onCloseMetadata}
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
        onClose={onCloseReplaceText}
        pdfId={selectedId}
        onSuccess={loadDocIntoViewer}
      />
      <ProtectDialog
        open={protectOpen}
        onClose={onCloseProtect}
        pdfId={selectedId}
      />
      <PrintOptionsModal
        open={printOptionsOpen}
        onClose={onClosePrintOptions}
        onConfirm={executePrint}
        pdfUrl={fileUrl}
        initialPage={currentPage}
        totalPages={totalPages || 1}
      />
      <SignDialog
        open={signOpen}
        onClose={onCloseSign}
        pdfId={selectedId}
        totalPages={totalPages}
        pdfUrl={fileUrl}
        onSuccess={loadDocIntoViewer}
      />
      <ShareDialog
        open={shareOpen}
        onClose={onCloseShare}
        pdfId={selectedId}
      />
      <AnnotationDialog
        open={annotateOpen}
        onClose={onCloseAnnotate}
        pdfId={selectedId}
        currentPage={currentPage}
        pdfUrl={fileUrl}
        onSuccess={() => setSidebarRefreshKey((prev) => prev + 1)}
      />
      <OcrModal
        open={ocrOpen}
        onClose={onCloseOcr}
        pdfId={selectedId}
        onSuccess={() => setSidebarRefreshKey((prev) => prev + 1)}
      />
      <ImportExportDialog
        open={importExportOpen}
        onClose={onCloseImportExport}
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
        onClose={onCloseDeleteModal}
        file={fileToDelete}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}