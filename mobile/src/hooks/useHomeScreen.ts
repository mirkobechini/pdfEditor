/**
 * Hook extracted from HomeScreen (issue #885, A3c - step 1).
 * Owns all HomeScreen state, action handlers, focus/sync effects and
 * derived values so the screen component stays a thin renderer. Child
 * presentational components receive the returned state object `s`.
 *
 * Split into cohesive <=400-line units (issue #885, A3c-fix):
 *   - useHomeScreenState  : state, services, search, multi-select, snackbar
 *   - useHomeScreenFetch  : loadPdfs/onRefresh and focus/sync reload effects
 *   - useHomeScreenActions: every action handler + dialog/menu state
 * This file is a thin orchestrator reassembling the exact same public shape.
 * Zero behavior changes.
 */
import { useTheme } from "react-native-paper";
import { useHomeScreenState } from "./useHomeScreenState";
import { useHomeScreenFetch } from "./useHomeScreenFetch";
import { useHomeScreenActions } from "./useHomeScreenActions";

interface UseHomeScreenOptions {
    onPdfCountChange?: (count: number) => void;
}

export function useHomeScreen({ onPdfCountChange }: UseHomeScreenOptions) {
    const st = useHomeScreenState();
    const fetch = useHomeScreenFetch(st, onPdfCountChange);
    const act = useHomeScreenActions(st, fetch);

    return {
        // theme & layout
        theme: st.theme,
        insets: st.insets,
        // data & progress
        pdfs: st.pdfs,
        filteredPdfs: st.filteredPdfs,
        loading: st.loading,
        refreshing: st.refreshing,
        searchQuery: st.searchQuery,
        syncStatus: st.syncStatus,
        syncEnabled: st.syncEnabled,
        isSyncing: st.isSyncing,
        progress: st.progress,
        userId: st.userId,
        // add-pdf menu
        showMenu: st.showMenu,
        setShowMenu: st.setShowMenu,
        // selection
        multiSelect: st.multiSelect,
        selectedIds: st.selectedIds,
        toggleSelect: st.toggleSelect,
        enterMultiSelect: st.enterMultiSelect,
        exitMultiSelect: st.exitMultiSelect,
        selectAllFiltered: st.selectAllFiltered,
        // setters used by the renderer
        setContextPdf: act.setContextPdf,
        setRenameDialog: act.setRenameDialog,
        setRenameText: act.setRenameText,
        setRenameTarget: act.setRenameTarget,
        setDetailsPdf: act.setDetailsPdf,
        setReplaceTextPdf: act.setReplaceTextPdf,
        setSearchQuery: st.setSearchQuery,
        setSnackbarVisible: st.setSnackbarVisible,
        setDeleteTarget: act.setDeleteTarget,
        setSyncAfterUpload: act.setSyncAfterUpload,
        // snackbar
        snackbarMsg: st.snackbarMsg,
        snackbarVisible: st.snackbarVisible,
        showSnack: st.showSnack,
        // actions
        onRefresh: fetch.onRefresh,
        handleUpload: act.handleUpload,
        handleBatchDelete: act.handleBatchDelete,
        handleShare: act.handleShare,
        handleDownload: act.handleDownload,
        handleDelete: act.handleDelete,
        handleDeleteSync: act.handleDeleteSync,
        handleItemPress: act.handleItemPress,
        handleItemLongPress: act.handleItemLongPress,
        openRename: act.openRename,
        confirmRename: act.confirmRename,
        formatSize: act.formatSize,
        loadPdfs: fetch.loadPdfs,
        // dialog/detail actions
        openDetails: act.openDetails,
        openReplaceText: act.openReplaceText,
        handleRemoveFromCloud: act.handleRemoveFromCloud,
        handleSyncToCloud: act.handleSyncToCloud,
        handleToggleSyncExclude: act.handleToggleSyncExclude,
        handleSyncAfterUploadNo: act.handleSyncAfterUploadNo,
        handleSyncAfterUploadYes: act.handleSyncAfterUploadYes,
        goToTools: act.goToTools,
        goToScanner: act.goToScanner,
        syncingPdf: act.syncingPdf,
        deleteTarget: act.deleteTarget,
        renameDialog: act.renameDialog,
        renameText: act.renameText,
        renameTarget: act.renameTarget,
        detailsPdf: act.detailsPdf,
        replaceTextPdf: act.replaceTextPdf,
        contextPdf: act.contextPdf,
        syncAfterUpload: act.syncAfterUpload,
    };
}

/** Shape returned by useHomeScreen, used by extracted child renderers. */
export type HomeScreenState = ReturnType<typeof useHomeScreen>;