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
import { useCloudSyncContext } from "../../hooks/CloudSyncContext";
import { useEditorState } from "../../hooks/useEditorState";

const API_BASE = getApiBaseUrl();

export default function EditorPage() {
    const te = useTranslations("editor");
    const { user } = useAuth();
    // Istanza condivisa del sync cloud (unica per l'app, montata in ClientLayout).
    const { status: syncStatus, syncEnabled, excludedIds, toggleExclude, pendingCloudDeletions, resolveCloudDeletion, isSyncing, lastSyncResult, clearSyncResult, triggerInitialSync } = useCloudSyncContext();
    // Ingresso via LOGIN: qui il sync non è ancora partito (la start-up, se c'è
    // stato, ha già gestito l'auto-login). Al mount lanciamo il sync iniziale:
    // la guardia per-utente di triggerInitialSync fa sì che se è già partito
    // (per lo stesso utente) sia un no-op → mai doppio loader.
    React.useEffect(() => {
        triggerInitialSync();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [triggerInitialSync]);
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

            {/* Sync completato: dialog modale (stile Settings) al termine del
                sync, mostrato quando c'è un lastSyncResult e non si sta più
                sincronizzando. Chiudibile con clearSyncResult dal context. */}
            {lastSyncResult && !isSyncing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={clearSyncResult}>
                    <div className="rounded-2xl border border-white/10 bg-[#221b16] p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-[20px] font-bold text-white mb-4">Sync completato</h2>
                        <div className="space-y-2 text-[14px]">
                            {lastSyncResult.uploaded > 0 && <p className="text-green-400">✅ {lastSyncResult.uploaded} PDF caricati sul cloud</p>}
                            {lastSyncResult.downloaded > 0 && <p className="text-blue-400">⬇️ {lastSyncResult.downloaded} PDF scaricati dal cloud</p>}
                            {lastSyncResult.skippedExisting > 0 && <p className="text-yellow-400">⏭️ {lastSyncResult.skippedExisting} PDF già presenti sul cloud (saltati)</p>}
                            {lastSyncResult.skippedLocked > 0 && <p className="text-yellow-400">🔒 {lastSyncResult.skippedLocked} PDF saltati (protetti da password)</p>}
                            {lastSyncResult.skipped > 0 && (
                                <p className="text-yellow-400">⏭️ {lastSyncResult.skipped} PDF saltati (protetti da password)</p>
                            )}
                            {lastSyncResult.errors.length > 0 && (
                                <div className="mt-3">
                                    <p className="text-red-400 font-semibold">⚠️ Errori ({lastSyncResult.errors.length}):</p>
                                    {lastSyncResult.errors.map((err, i) => (
                                        <p key={i} className="text-red-300 text-[12px] ml-2">{err}</p>
                                    ))}
                                </div>
                            )}
                            {lastSyncResult.uploaded === 0 && lastSyncResult.downloaded === 0 && lastSyncResult.skipped === 0 && lastSyncResult.errors.length === 0 && (
                                <p className="text-[#9d9184]">Nessun PDF da sincronizzare. Tutti già allineati.</p>
                            )}
                        </div>
                        <button
                            onClick={clearSyncResult}
                            className="mt-4 w-full cursor-pointer rounded-xl bg-[#f7871f] px-6 py-2 text-[14px] font-semibold text-white"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}