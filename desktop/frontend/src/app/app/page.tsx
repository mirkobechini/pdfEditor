"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "../../shared/auth";
import { getApiBaseUrl } from "../../shared/tauri";
import { EditorSidebar } from "../components/EditorSidebar";
import { EditorRightPanel } from "../components/EditorRightPanel";
import { EditorViewer } from "../components/EditorViewer";
import { EditorModals } from "../components/EditorModals";
import CloudDeletionDialog from "../../components/CloudDeletionDialog";
import { EditorFooter } from "../components/EditorFooter";
import { useCloudSync } from "../../hooks/useCloudSync";
import { useEditorState } from "../../hooks/useEditorState";

const API_BASE = getApiBaseUrl();

export default function EditorPage() {
    const te = useTranslations("editor");
    const { user } = useAuth();
    const { status: syncStatus, syncEnabled, excludedIds, toggleExclude, pendingCloudDeletions, resolveCloudDeletion } = useCloudSync();
    const {
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
    } = useEditorState();

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
                    syncEnabled={syncEnabled}
                    excludedIds={excludedIds ?? []}
                    onToggleExclude={(doc) => toggleExclude?.(doc.id)}
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

                <EditorViewer
                    te={te}
                    selectedDoc={selectedDoc}
                    dragOver={dragOver}
                    pdfUrl={pdfUrl}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    zoom={zoom}
                    openMenu={openMenu}
                    organizeRef={organizeRef}
                    convertRef={convertRef}
                    annotateMenuRef={annotateMenuRef}
                    onDownload={handleDownload}
                    onPrint={handlePrint}
                    onPageChange={setCurrentPage}
                    onTotalPagesChange={setTotalPages}
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
                    onUnlock={() => setLockOpen(true)}
                />

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

            <EditorModals
                te={te}
                selectedDoc={selectedDoc}
                pdfUrl={pdfUrl}
                currentPage={currentPage}
                removePagesOpen={removePagesOpen}
                reorderOpen={reorderOpen}
                splitOpen={splitOpen}
                mergeOpen={mergeOpen}
                compressOpen={compressOpen}
                importExportOpen={importExportOpen}
                signOpen={signOpen}
                ocrOpen={ocrOpen}
                printOptionsOpen={printOptionsOpen}
                annotateOpen={annotateOpen}
                shareOpen={shareOpen}
                lockOpen={lockOpen}
                replaceTextOpen={replaceTextOpen}
                metadataOpen={metadataOpen}
                deleteConfirm={deleteConfirm}
                onCloseRemovePages={() => setRemovePagesOpen(false)}
                onCloseReorder={() => setReorderOpen(false)}
                onCloseSplit={() => setSplitOpen(false)}
                onCloseMerge={() => setMergeOpen(false)}
                onCloseCompress={() => setCompressOpen(false)}
                onCloseImportExport={() => setImportExportOpen(false)}
                onCloseSign={() => setSignOpen(false)}
                onCloseOcr={() => setOcrOpen(false)}
                onClosePrintOptions={() => setPrintOptionsOpen(false)}
                onCloseAnnotate={() => setAnnotateOpen(false)}
                onCloseShare={() => setShareOpen(false)}
                onCloseLock={() => setLockOpen(false)}
                onCloseReplaceText={() => setReplaceTextOpen(false)}
                onCloseMetadata={() => setMetadataOpen(false)}
                onCancelDelete={() => setDeleteConfirm(null)}
                onConfirmDelete={() => handleDelete(deleteConfirm!)}
                onDocUpdated={handleDocUpdated}
                onSplitSaved={(newDocs) => {
                    setDocs((prev) => [...newDocs, ...prev]);
                    setSelectedDoc(newDocs[0]);
                    setPdfRefreshKey((k) => k + 1);
                }}
                onNewDocSaved={(newDoc) => {
                    setDocs((prev) => [newDoc, ...prev]);
                    setSelectedDoc(newDoc);
                    setPdfRefreshKey((k) => k + 1);
                }}
                onSignSaved={(updatedDoc) => {
                    setDocs((prev) => prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d)));
                    setSelectedDoc(updatedDoc);
                    setPdfRefreshKey((k) => k + 1);
                }}
                onRefresh={() => setPdfRefreshKey((k) => k + 1)}
                onPrintConfirm={executePrint}
            />

            <EditorFooter te={te} apiBase={API_BASE} />

            {/* #990: PDF eliminati dal cloud → chiedi se eliminarli anche in locale */}
            <CloudDeletionDialog
                deletion={pendingCloudDeletions?.[0] ?? null}
                onResolve={resolveCloudDeletion}
            />
        </div>
    );
}