/**
 * Hook extracted from HomeScreen (issue #885, A3c - step 1).
 * Owns all HomeScreen state, action handlers, focus/sync effects and
 * derived values so the screen component stays a thin renderer. Child
 * presentational components receive the returned state object `s`.
 * Zero behavior changes.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { File } from "expo-file-system";
import { StorageAccessFramework } from "expo-file-system/legacy";
import { setBadgeCountAsync } from "expo-notifications";
import * as Sharing from "expo-sharing";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import type { LocalPdf } from "../shared/types";
import { usePdfStorage } from "./usePdfStorage";
import { useAuth } from "../shared/auth";
import { getLocalPdfById, savePdfLocally, deleteLocalPdf, togglePdfSyncExclude } from "../services/localDb";
import { useCloudSyncContext } from "./CloudSyncContext";
import type { DeleteSyncOption } from "../screens/DeleteSyncDialog";

type HomeNavProp = NativeStackNavigationProp<RootStackParamList, "Main">;

interface UseHomeScreenOptions {
    onPdfCountChange?: (count: number) => void;
}

export function useHomeScreen({ onPdfCountChange }: UseHomeScreenOptions) {
    const theme = useTheme();
    const navigation = useNavigation<HomeNavProp>();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const { pickAndSavePdf, loadLocalPdfs } = usePdfStorage();
    const { user } = useAuth();
    const { status: syncStatus, syncEnabled, syncMode, progress, isSyncing, deletePdf, uploadPdf } = useCloudSyncContext();
    const userId = user?.id || "";
    const [deleteTarget, setDeleteTarget] = useState<LocalPdf | null>(null);
    const [syncingPdf, setSyncingPdf] = useState(false);
    const [syncAfterUpload, setSyncAfterUpload] = useState<{ pdfId: string; pdfName: string } | null>(null);
    const [pdfs, setPdfs] = useState<LocalPdf[]>([]);
    const [loading, setLoading] = useState(true);
    const [showMenu, setShowMenu] = useState(false);
    const [contextPdf, setContextPdf] = useState<LocalPdf | null>(null);
    const [renameDialog, setRenameDialog] = useState(false);
    const [renameText, setRenameText] = useState("");
    const [renameTarget, setRenameTarget] = useState<LocalPdf | null>(null);
    const [detailsPdf, setDetailsPdf] = useState<LocalPdf | null>(null);
    const [replaceTextPdf, setReplaceTextPdf] = useState<LocalPdf | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [snackbarMsg, setSnackbarMsg] = useState("");
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const [multiSelect, setMultiSelect] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    function showSnack(msg: string) {
        setSnackbarMsg(msg);
        setSnackbarVisible(true);
    }

    const toggleSelect = useCallback((id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    function enterMultiSelect() {
        setMultiSelect(true);
        setSelectedIds(new Set());
    }

    function exitMultiSelect() {
        setMultiSelect(false);
        setSelectedIds(new Set());
    }

    async function loadPdfs() {
        setLoading(true);
        try {
            const local = await loadLocalPdfs(userId);
            setPdfs(local);
            onPdfCountChange?.(local.length);
            setBadgeCountAsync(local.length).catch(() => { });
        } catch {
            setPdfs([]);
        } finally {
            setLoading(false);
        }
    }

    async function handleBatchDelete() {
        for (const id of selectedIds) {
            const pdf = pdfs.find((p) => p.id === id);
            if (!pdf) continue;
            try {
                const file = new File(pdf.uri);
                if (file.exists) file.delete();
            } catch { /* ignore */ }
            await deleteLocalPdf(id);
        }
        showSnack(t("home.deletedBatch", { count: selectedIds.size }));
        exitMultiSelect();
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

    const filteredPdfs = useMemo(() => {
        if (!searchQuery.trim()) return pdfs;
        const q = searchQuery.toLowerCase();
        return pdfs.filter((p) => p.original_filename.toLowerCase().includes(q));
    }, [pdfs, searchQuery]);

    async function onRefresh() {
        setRefreshing(true);
        try {
            const local = await loadLocalPdfs(userId);
            setPdfs(local);
            onPdfCountChange?.(local.length);
            setBadgeCountAsync(local.length).catch(() => { });
        } catch {
            setPdfs([]);
        } finally {
            setRefreshing(false);
        }
    }

    // Reload PDFs when screen is focused (lightweight, no spinner to avoid lag).
    // Also clears the initial `loading` spinner once local PDFs are in — this
    // used to depend solely on the isSyncing effect below, which never fires
    // (leaving the screen stuck on the spinner forever) when sync never starts
    // — offline, disabled, or the sync loop just hasn't kicked in yet.
    useFocusEffect(
        useCallback(() => {
            loadLocalPdfs(userId).then((local) => {
                setPdfs(local);
                onPdfCountChange?.(local.length);
            }).catch(() => { }).finally(() => setLoading(false));
        }, [userId])
    );

    // Reload PDFs when sync completes (isSyncing goes from true to false)
    // so downloaded PDFs appear immediately instead of only on next focus
    const prevSyncingRef = useRef(isSyncing);
    useEffect(() => {
        if (prevSyncingRef.current && !isSyncing) {
            loadPdfs();
        }
        prevSyncingRef.current = isSyncing;
    }, [isSyncing]);

    // Reload PDFs as sync progresses so downloaded PDFs appear one by one
    // (progress.current advances on each upload/download step)
    const prevProgressRef = useRef(progress?.current ?? 0);
    useEffect(() => {
        const current = progress?.current ?? 0;
        if (isSyncing && current !== prevProgressRef.current) {
            // Lightweight reload without loading spinner (avoid flicker during sync)
            loadLocalPdfs(userId).then((local) => {
                setPdfs(local);
                onPdfCountChange?.(local.length);
            }).catch(() => { });
        }
        prevProgressRef.current = current;
    }, [progress, isSyncing]);

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

    function formatSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

    function selectAllFiltered() {
        setSelectedIds(new Set(filteredPdfs.map((p) => p.id)));
    }

    function goToTools() {
        navigation.navigate("Tools");
    }

    function goToScanner() {
        setShowMenu(false);
        navigation.navigate("Scanner");
    }

    // getLocalPdfById is imported but unused by the renderer; keep the
    // service import surface minimal — it is needed if a future viewer
    // detail needs it. (Retained import for parity with prior behavior.)
    void getLocalPdfById;

    return {
        // theme & layout
        theme,
        insets,
        // data & progress
        pdfs,
        filteredPdfs,
        loading,
        refreshing,
        searchQuery,
        syncStatus,
        syncEnabled,
        isSyncing,
        progress,
        userId,
        // add-pdf menu
        showMenu,
        setShowMenu,
        // selection
        multiSelect,
        selectedIds,
        toggleSelect,
        enterMultiSelect,
        exitMultiSelect,
        selectAllFiltered,
        // setters used by the renderer
        setContextPdf,
        setRenameDialog,
        setRenameText,
        setRenameTarget,
        setDetailsPdf,
        setReplaceTextPdf,
        setSearchQuery,
        setSnackbarVisible,
        setDeleteTarget,
        setSyncAfterUpload,
        // snackbar
        snackbarMsg,
        snackbarVisible,
        showSnack,
        // actions
        onRefresh,
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
        loadPdfs,
        // dialog/detail actions
        openDetails,
        openReplaceText,
        handleRemoveFromCloud,
        handleSyncToCloud,
        handleToggleSyncExclude,
        handleSyncAfterUploadNo,
        handleSyncAfterUploadYes,
        goToTools,
        goToScanner,
        syncingPdf,
        deleteTarget,
        renameDialog,
        renameText,
        renameTarget,
        detailsPdf,
        replaceTextPdf,
        contextPdf,
        syncAfterUpload,
    };
}

/** Shape returned by useHomeScreen, used by extracted child renderers. */
export type HomeScreenState = ReturnType<typeof useHomeScreen>;