/**
 * Hook extracted from ToolsScreen (issue #885, A3a - step 1).
 * Owns all ToolsScreen state, action handlers and progress flags so the
 * screen component stays a thin renderer. Zero behavior changes.
 *
 * Split into cohesive <=400-line units (issue #885, A3a-fix):
 *   - useToolsScreenState  : state, services, dialog states, load/reload
 *   - useToolsScreenDialogs: open*Dialog openers, page toggling, rename
 *   - useToolsScreenActions: execute-handle* flow handlers + selection
 * This file is a thin orchestrator reassembling the exact same public shape.
 */
import { useToolsScreenState } from "./useToolsScreenState";
import { useToolsScreenDialogs } from "./useToolsScreenDialogs";
import { useToolsScreenActions } from "./useToolsScreenActions";

export function useToolsScreen() {
    const st = useToolsScreenState();
    const dlg = useToolsScreenDialogs(st);
    const act = useToolsScreenActions(st, dlg);

    return {
        // theme for child renderers
        theme: st.theme,
        // data & progress
        pdfs: st.pdfs,
        loading: st.loading,
        operation: st.operation,
        selectedIds: st.selectedIds,
        result: st.result,
        snackbarVisible: st.snackbarVisible,
        isOnline: st.isOnline,
        // setters used by the renderer
        setOperation: st.setOperation,
        setSelectedIds: st.setSelectedIds,
        setSnackbarVisible: st.setSnackbarVisible,
        // selection
        toggleSelect: act.toggleSelect,
        handleItemPress: act.handleItemPress,
        // actions
        handleMerge: act.handleMerge,
        // dialogs
        splitDialog: st.splitDialog,
        setSplitDialog: st.setSplitDialog,
        toggleSplitPage: dlg.toggleSplitPage,
        removeDialog: st.removeDialog,
        setRemoveDialog: st.setRemoveDialog,
        toggleRemovePage: dlg.toggleRemovePage,
        reorderDialog: st.reorderDialog,
        setReorderDialog: st.setReorderDialog,
        movePageUp: dlg.movePageUp,
        movePageDown: dlg.movePageDown,
        metadataDialog: st.metadataDialog,
        setMetadataDialog: st.setMetadataDialog,
        saveMetadata: act.saveMetadata,
        compressDialog: st.compressDialog,
        setCompressDialog: st.setCompressDialog,
        compressQuality: st.compressQuality,
        setCompressQuality: st.setCompressQuality,
        compressNameInput: st.compressNameInput,
        setCompressNameInput: st.setCompressNameInput,
        importExportDialog: st.importExportDialog,
        setImportExportDialog: st.setImportExportDialog,
        exportFormat: st.exportFormat,
        setExportFormat: st.setExportFormat,
        importExportBusy: st.importExportBusy,
        passwordDialog: st.passwordDialog,
        setPasswordDialog: st.setPasswordDialog,
        passwordInput: st.passwordInput,
        setPasswordInput: st.setPasswordInput,
        passwordConfirm: st.passwordConfirm,
        setPasswordConfirm: st.setPasswordConfirm,
        signDialog: st.signDialog,
        setSignDialog: st.setSignDialog,
        annotationDialog: st.annotationDialog,
        setAnnotationDialog: st.setAnnotationDialog,
        ocrDialog: st.ocrDialog,
        setOcrDialog: st.setOcrDialog,
        shareDialog: st.shareDialog,
        setShareDialog: st.setShareDialog,
        nameDialog: st.nameDialog,
        setNameDialog: st.setNameDialog,
        nameInput: st.nameInput,
        setNameInput: st.setNameInput,
        renamePdf: st.renamePdf,
        setRenamePdf: st.setRenamePdf,
        renameInput: st.renameInput,
        setRenameInput: st.setRenameInput,
        renameSelection: st.renameSelection,
        setRenameSelection: st.setRenameSelection,
        renameInputRef: st.renameInputRef,
        submitRename: dlg.submitRename,
        // execution resolvers used by the name dialog
        executeMerge: act.executeMerge,
        executeSplit: act.executeSplit,
        executeReorder: act.executeReorder,
        executeRemove: act.executeRemove,
        executeCompress: act.executeCompress,
        executeImport: act.executeImport,
        executeExport: act.executeExport,
        executeProtect: act.executeProtect,
        executeUnlock: act.executeUnlock,
        // flow dialog callbacks
        handleSigned: act.handleSigned,
        handleSignFailed: act.handleSignFailed,
        handleAnnotationSaved: act.handleAnnotationSaved,
        handleAnnotationFailed: act.handleAnnotationFailed,
        handleOcrDone: act.handleOcrDone,
        handleOcrFailed: act.handleOcrFailed,
    };
}

/** Shape returned by useToolsScreen, used by extracted child renderers. */
export type ToolsScreenState = ReturnType<typeof useToolsScreen>;