/**
 * Actions slice of useHomeScreen (issue #885, A3c - split).
 * Owns every action handler plus the dialog/context/menu state those
 * handlers drive (share/download/delete/sync/rename/details/replace-text,
 * add-PDF menu, sync-after-upload). Zero behavior changes; composed back by
 * useHomeScreen.
 */
import { useState, useCallback } from "react";
import { File } from "expo-file-system";
import { StorageAccessFramework } from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import type { LocalPdf } from "../shared/types";
import { savePdfLocally, deleteLocalPdf, togglePdfSyncExclude } from "../services/localDb";
import type { DeleteSyncOption } from "../screens/DeleteSyncDialog";
import type { HomeScreenStateCtx } from "./useHomeScreenState";
import type { HomeScreenFetchCtx } from "./useHomeScreenFetch";

export interface HomeScreenDialogCtx {
    deleteTarget: LocalPdf | null;
    setDeleteTarget: (v: LocalPdf | null) => void;
    syncingPdf: boolean;
    setSyncingPdf: (v: boolean) => void;
    syncAfterUpload: { pdfId: string; pdfName: string } | null;
    setSyncAfterUpload: (v: { pdfId: string; pdfName: string } | null) => void;
    showMenu: boolean;
    setShowMenu: (v: boolean) => void;
    contextPdf: LocalPdf | null;
    setContextPdf: (v: LocalPdf | null) => void;
    renameDialog: boolean;
    setRenameDialog: (v: boolean) => void;
    renameText: string;
    setRenameText: (v: string) => void;
    renameTarget: LocalPdf | null;
    setRenameTarget: (v: LocalPdf | null) => void;
    detailsPdf: LocalPdf | null;
    setDetailsPdf: (v: LocalPdf | null) => void;
    replaceTextPdf: LocalPdf | null;
    setReplaceTextPdf: (v: LocalPdf | null) => void;
    handleUpload: () => Promise<void>;
    handleBatchDelete: () => Promise<void>;
    handleShare: (pdf: LocalPdf) => Promise<void>;
    handleDownload: (pdf: LocalPdf) => Promise<void>;
    handleDelete: (pdf: LocalPdf) => Promise<void>;
    handleDeleteSync: (option: DeleteSyncOption) => Promise<void>;
    handleItemPress: (item: LocalPdf) => void;
    handleItemLongPress: (item: LocalPdf) => void;
    openRename: (pdf: LocalPdf) => void;
    confirmRename: () => Promise<void>;
    formatSize: (bytes: number) => string;
    openDetails: (pdf: LocalPdf) => void;
    openReplaceText: (pdf: LocalPdf) => void;
    handleRemoveFromCloud: (pdf: LocalPdf) => Promise<void>;
    handleSyncToCloud: (pdf: LocalPdf) => Promise<void>;
    handleToggleSyncExclude: (pdf: LocalPdf) => Promise<void>;
    handleSyncAfterUploadNo: () => void;
    handleSyncAfterUploadYes: () => void;
    goToTools: () => void;
    goToScanner: () => void;
}

export function useHomeScreenActions(
    st: HomeScreenStateCtx,
    fetch: HomeScreenFetchCtx,
): HomeScreenDialogCtx {
    const navigation = st.navigation;
    const { t } = st;
    const { loadPdfs } = fetch;
    const { showSnack } = st;
    const { syncEnabled } = st;
    const { userId, pickAndSavePdf, deletePdf, uploadPdf, syncStatus, setShowMenu } = st;
    void syncStatus;

    // Dialog / context state
    const [deleteTarget, setDeleteTarget] = useState<LocalPdf | null>(null);
    const [syncingPdf, setSyncingPdf] = useState(false);
    const [syncAfterUpload, setSyncAfterUpload] = useState<{ pdfId: string; pdfName: string } | null>(null);
    const [contextPdf, setContextPdf] = useState<LocalPdf | null>(null);
    const [renameDialog, setRenameDialog] = useState(false);
    const [renameText, setRenameText] = useState("");
    const [renameTarget, setRenameTarget] = useState<LocalPdf | null>(null);
    const [detailsPdf, setDetailsPdf] = useState<LocalPdf | null>(null);
    const [replaceTextPdf, setReplaceTextPdf] = useState<LocalPdf | null>(null);

    function formatSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    async function handleUpload() {
        setShowMenu(false);
        const pdf = await pickAndSavePdf(userId);
        if (pdf) {
            if (syncEnabled) {
                setSyncAfterUpload({ pdfId: pdf.id, pdfName: pdf.original_filename });
            } else {
                navigation.navigate("PdfViewer", {
                    pdfId: pdf.id,
                    title: pdf.original_filename,
                });
            }
        }
    }

    async function handleBatchDelete() {
        for (const id of st.selectedIds) {
            const pdf = st.pdfs.find((p) => p.id === id);
            if (!pdf) continue;
            try {
                const file = new File(pdf.uri);
                if (file.exists) file.delete();
            } catch { /* ignore */ }
            await deleteLocalPdf(id);
        }
        showSnack(t("home.deletedBatch", { count: st.selectedIds.size }));
        st.exitMultiSelect();
        await loadPdfs();
    }

    async function handleShare(pdf: LocalPdf) {
        setContextPdf(null);
        try {
            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
                showSnack(t("home.sharingNotAvailable"));
                return;
            }
            await Sharing.shareAsync(pdf.uri, {
                mimeType: "application/pdf",
                dialogTitle: `Share ${pdf.original_filename}`,
            });
        } catch {
            showSnack(t("home.shareFailed"));
        }
    }

    async function handleDownload(pdf: LocalPdf) {
        setContextPdf(null);
        try {
            const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (!permissions.granted) {
                showSnack(t("home.permissionDenied"));
                return;
            }
            const name = pdf.original_filename.endsWith(".pdf")
                ? pdf.original_filename.replace(/\.pdf$/i, "")
                : pdf.original_filename;
            const safUri = await StorageAccessFramework.createFileAsync(
                permissions.directoryUri,
                name,
                "application/pdf"
            );
            const file = new File(pdf.uri);
            const bytes = await file.arrayBuffer();
            let binary = "";
            const arr = new Uint8Array(bytes);
            for (let i = 0; i < arr.length; i++) {
                binary += String.fromCharCode(arr[i]);
            }
            const base64 = btoa(binary);
            await StorageAccessFramework.writeAsStringAsync(safUri, base64, {
                encoding: "base64",
            });
            showSnack(t("home.downloaded", { name: pdf.original_filename }));
        } catch {
            showSnack(t("home.downloadFailed"));
        }
    }

    const handleDelete = useCallback(async (pdf: LocalPdf) => {
        setContextPdf(null);
        // If PDF is cloud-synced and sync is enabled, ask what to delete
        if (syncEnabled && pdf.cloud_synced === 1) {
            setDeleteTarget(pdf);
            return;
        }
        // Otherwise simple local delete
        try {
            const file = new File(pdf.uri);
            if (file.exists) file.delete();
        } catch { /* ignore */ }
        await deleteLocalPdf(pdf.id);
        await loadPdfs();
        showSnack(t("home.deleted", { name: pdf.original_filename }));
        // loadPdfs/showSnack/t are recreated every render (not memoized
        // themselves) but don't go stale in a way that matters here — they
        // just read fresh DB state / call stable setState setters. Omitted
        // so this callback (passed down to PdfListItem) stays referentially
        // stable across renders instead of only when syncEnabled changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [syncEnabled]);

    const handleItemPress = useCallback(
        (item: LocalPdf) => {
            navigation.navigate("PdfViewer", { pdfId: item.id, title: item.original_filename });
        },
        [navigation],
    );

    const handleItemLongPress = useCallback((item: LocalPdf) => {
        setContextPdf(item);
    }, []);

    function openRename(pdf: LocalPdf) {
        setContextPdf(null);
        setRenameTarget(pdf);
        setRenameText(pdf.original_filename);
        setRenameDialog(true);
    }

    async function confirmRename() {
        if (!renameTarget || !renameText.trim()) return;
        const updated = { ...renameTarget, original_filename: renameText.trim(), updated_at: new Date().toISOString() };
        await savePdfLocally(updated);
        setRenameDialog(false);
        setRenameTarget(null);
        await loadPdfs();
    }

    function openDetails(pdf: LocalPdf) {
        setContextPdf(null);
        setDetailsPdf(pdf);
    }

    function openReplaceText(pdf: LocalPdf) {
        setContextPdf(null);
        setReplaceTextPdf(pdf);
    }

    /** Remove a single PDF from the cloud (context menu action). */
    async function handleRemoveFromCloud(pdf: LocalPdf) {
        setContextPdf(null);
        setSyncingPdf(true);
        try {
            await deletePdf(pdf.id, "cloud");
            await loadPdfs();
            showSnack(t("home.removedFromCloud", { name: pdf.original_filename }));
        } finally {
            setSyncingPdf(false);
        }
    }

    /** Sync a specifically selected PDF to the cloud (context menu action). */
    async function handleSyncToCloud(pdf: LocalPdf) {
        setContextPdf(null);
        setSyncingPdf(true);
        try {
            const ok = await uploadPdf(pdf.id);
            if (ok) {
                await loadPdfs();
                showSnack(t("home.syncedToCloud", { name: pdf.original_filename }));
            } else {
                showSnack(t("home.syncErrorUploadFailed", { name: pdf.original_filename }));
            }
        } finally {
            setSyncingPdf(false);
        }
    }

    /** Toggle cloud-sync exclude flag on a single PDF (context menu action). */
    async function handleToggleSyncExclude(pdf: LocalPdf) {
        const newVal = pdf.cloud_synced_exclude === 1 ? false : true;
        await togglePdfSyncExclude(pdf.id, newVal);
        setContextPdf(null);
        await loadPdfs();
        showSnack(newVal ? t("home.excludedFromSync", { name: pdf.original_filename }) : t("home.includedInSync", { name: pdf.original_filename }));
    }

    /** Confirm deleting a PDF via the DeleteSyncDialog (option-scoped). */
    async function handleDeleteSync(option: DeleteSyncOption) {
        if (!deleteTarget) return;
        const ok = await deletePdf(deleteTarget.id, option);
        setDeleteTarget(null);
        await loadPdfs();
        if (ok) {
            showSnack(t("home.deleted", { name: deleteTarget.original_filename }));
        }
    }

    /** After upload, "No" → open viewer directly. */
    function handleSyncAfterUploadNo() {
        const pdfId = syncAfterUpload?.pdfId;
        const pdfName = syncAfterUpload?.pdfName;
        setSyncAfterUpload(null);
        if (pdfId) navigation.navigate("PdfViewer", { pdfId, title: pdfName || "" });
    }

    /** After upload, "Yes" → upload to cloud then open viewer. */
    function handleSyncAfterUploadYes() {
        const pdfId = syncAfterUpload?.pdfId;
        const pdfName = syncAfterUpload?.pdfName;
        setSyncAfterUpload(null);
        if (pdfId) {
            uploadPdf(pdfId).then((ok) => {
                loadPdfs();
                if (ok) {
                    navigation.navigate("PdfViewer", { pdfId, title: pdfName || "" });
                } else {
                    showSnack(t("home.syncErrorUploadFailed", { name: pdfName || "" }));
                }
            });
        }
    }

    function goToTools() {
        navigation.navigate("Tools");
    }

    function goToScanner() {
        setShowMenu(false);
        navigation.navigate("Scanner");
    }

    return {
        deleteTarget,
        setDeleteTarget,
        syncingPdf,
        setSyncingPdf,
        syncAfterUpload,
        setSyncAfterUpload,
        showMenu: st.showMenu,
        setShowMenu,
        contextPdf,
        setContextPdf,
        renameDialog,
        setRenameDialog,
        renameText,
        setRenameText,
        renameTarget,
        setRenameTarget,
        detailsPdf,
        setDetailsPdf,
        replaceTextPdf,
        setReplaceTextPdf,
        handleUpload,
        handleBatchDelete,
        handleShare,
        handleDownload,
        handleDelete,
        handleDeleteSync,
        handleItemPress,
        handleItemLongPress,
        openRename,
        confirmRename,
        formatSize,
        openDetails,
        openReplaceText,
        handleRemoveFromCloud,
        handleSyncToCloud,
        handleToggleSyncExclude,
        handleSyncAfterUploadNo,
        handleSyncAfterUploadYes,
        goToTools,
        goToScanner,
    };
}