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
    // Feedback breve del sync (es. "N caricati"/"Tutto allineato") mostrato
    // nella barra PDF della sidebar dopo la fine del sync. Il dialog modale
    // è stato rimosso (decisione 14/10): l'esito vive solo qui.
    const syncFeedback = React.useMemo(() => {
        if (!lastSyncResult) return null;
        const total = lastSyncResult.uploaded + lastSyncResult.downloaded;
        if (total > 0) return te("syncUploaded", { count: String(total) });
        if (lastSyncResult.errors.length > 0) return te("syncError");
        return te("syncAligned");
    }, [lastSyncResult, te]);

    // Dialog "Sync completato" (ripristinato su richiesta Mirko 14/10): si apre
    // quando il sync cloud termina con un risultato, mostrando il riepilogo
    // (caricati/scaricati/saltati + eventuali errori). Si chiude con "Chiudi"
    // (che azzera il risultato così non riappare finché non rifà il sync).
    const [syncDialogOpen, setSyncDialogOpen] = React.useState(false);
    const prevSyncingRef = React.useRef(isSyncing);
    React.useEffect(() => {
        const wasSyncing = prevSyncingRef.current;
        prevSyncingRef.current = isSyncing;
        // Transizione isSyncing true → false con un risultato disponibile.
        if (wasSyncing && !isSyncing && lastSyncResult) {
            setSyncDialogOpen(true);
        }
    }, [isSyncing, lastSyncResult]);
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
                    isSyncing={isSyncing}
                    syncFeedback={syncFeedback}
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

            {/* Dialog "Sync completato": riepilogo del sync appena terminato. */}
            {syncDialogOpen && lastSyncResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#201a15] p-6 shadow-2xl">
                        <h2 className="mb-1 text-base font-bold text-white">{te("syncCompleteTitle")}</h2>
                        <p className="mb-4 text-[12px] text-[#918476]">{te("syncCompleteDesc")}</p>
                        <div className="mb-5 space-y-1.5 rounded-xl border border-white/8 bg-white/[0.03] p-4 text-sm">
                            <p className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-[#c4b9ad]">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#48c769" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                    {te("syncUploadedLabel")}
                                </span>
                                <span className="font-semibold text-[#48c769]">{lastSyncResult.uploaded}</span>
                            </p>
                            <p className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-[#c4b9ad]">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5ba0f3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                    {te("syncDownloadedLabel")}
                                </span>
                                <span className="font-semibold text-[#5ba0f3]">{lastSyncResult.downloaded}</span>
                            </p>
                            <p className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-[#c4b9ad]">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e8b44c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" /></svg>
                                    {te("syncSkippedLabel")}
                                </span>
                                {/* skipped è già l'aggregato (già presenti + protetti): NON sommarlo
                                    alle componenti o raddoppia il conteggio. */}
                                <span className="font-semibold text-[#e8b44c]">{lastSyncResult.skipped}</span>
                            </p>
                            {lastSyncResult.errors.length > 0 && (
                                <p className="pt-2 text-[12px] text-red-400">
                                    {te("syncError")}: {lastSyncResult.errors.join(", ")}
                                </p>
                            )}
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={() => { clearSyncResult(); setSyncDialogOpen(false); }}
                                className="rounded-xl bg-[#f7871f] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#ce5a00]"
                            >
                                {te("close")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}