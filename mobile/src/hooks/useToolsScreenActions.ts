/**
 * Action/execution slice of useToolsScreen (issue #885, A3a - split).
 * Owns every execute* / handle* flow handler, merge handling, selection and
 * the item-press dispatcher. Zero behavior changes; composed back by
 * useToolsScreen.
 */
import { useCallback, useRef } from "react";
import type { LocalPdf } from "../shared/types";
import * as DocumentPicker from "expo-document-picker";
import { mergePdfs, splitPdf, reorderPages, removePages, updateMetadata, protectPdf, unlockPdf, compressPdf, compressPdfOffline, exportPdf, importFile } from "../services/pdfService";
import type { ToolsScreenStateCtx } from "./useToolsScreenState";
import type { ToolsScreenDialogsCtx } from "./useToolsScreenDialogs";

export interface ToolsScreenActionsCtx {
    handleMerge: () => Promise<void>;
    executeMerge: (fileName?: string) => Promise<void>;
    executeSplit: (fileName?: string) => Promise<void>;
    executeRemove: (fileName?: string) => Promise<void>;
    saveMetadata: () => Promise<void>;
    executeReorder: (fileName?: string) => Promise<void>;
    executeCompress: (fileName?: string) => Promise<void>;
    executeImport: () => Promise<void>;
    executeExport: () => Promise<void>;
    executeProtect: () => Promise<void>;
    executeUnlock: () => Promise<void>;
    handleSigned: (result: LocalPdf) => Promise<void>;
    handleSignFailed: () => Promise<void>;
    handleAnnotationSaved: (result: LocalPdf) => Promise<void>;
    handleAnnotationFailed: () => Promise<void>;
    handleOcrDone: (result: LocalPdf, characterCount: number, alreadySearchable: boolean) => Promise<void>;
    handleOcrFailed: () => Promise<void>;
    toggleSelect: (id: string) => void;
    handleItemPress: (item: LocalPdf) => void;
}

export function useToolsScreenActions(
    st: ToolsScreenStateCtx,
    dlg: ToolsScreenDialogsCtx,
): ToolsScreenActionsCtx {
    const { t, showResult, reloadPdfs } = st;

    async function handleMerge() {
        if (st.selectedIds.length < 2) { showResult(t("tools.selectMin2")); return; }
        // Ask for file name before merging
        st.setNameDialog({ type: "merge", data: { ids: [...st.selectedIds] } });
    }

    async function executeMerge(fileName?: string) {
        if (!st.nameDialog) return;
        const { ids } = st.nameDialog.data;
        st.setNameDialog(null);
        st.setLoading(true);
        const merged = await mergePdfs(ids, fileName);
        if (merged) {
            showResult(t("tools.mergeResult", { name: merged.original_filename }));
            st.setSelectedIds([]);
            await reloadPdfs();
        } else showResult(t("tools.mergeFailed"));
        st.setLoading(false);
    }

    // ─── Split ────────────────────────────────────────────────────

    async function executeSplit(fileName?: string) {
        if (!st.nameDialog) return;
        const { pdfId, totalPages, selectedPages } = st.nameDialog.data;
        st.setSplitDialog(null);
        st.setLoading(true);

        // Build contiguous ranges from selected pages (e.g., [1,2,4,5] → [[1,2],[4,5]])
        const selectedRanges: [number, number][] = [];
        let start = selectedPages[0];
        let end = selectedPages[0];
        for (let i = 1; i < selectedPages.length; i++) {
            if (selectedPages[i] === end + 1) {
                end = selectedPages[i];
            } else {
                selectedRanges.push([start, end]);
                start = selectedPages[i];
                end = selectedPages[i];
            }
        }
        selectedRanges.push([start, end]);

        // Remaining pages as contiguous ranges
        const remainingPages: number[] = [];
        for (let i = 1; i <= totalPages; i++) {
            if (!selectedPages.includes(i)) remainingPages.push(i);
        }
        const remainingRanges: [number, number][] = [];
        if (remainingPages.length > 0) {
            let rStart = remainingPages[0];
            let rEnd = remainingPages[0];
            for (let i = 1; i < remainingPages.length; i++) {
                if (remainingPages[i] === rEnd + 1) {
                    rEnd = remainingPages[i];
                } else {
                    remainingRanges.push([rStart, rEnd]);
                    rStart = remainingPages[i];
                    rEnd = remainingPages[i];
                }
            }
            remainingRanges.push([rStart, rEnd]);
        }

        const allRanges = [...selectedRanges, ...remainingRanges];
        const results = await splitPdf(pdfId, allRanges, fileName);
        showResult(t("tools.splitResult", { count: results.length }));
        st.setLoading(false);
        await reloadPdfs();
    }

    // ─── Reorder ──────────────────────────────────────────────────

    async function executeReorder(fileName?: string) {
        if (!st.reorderDialog) return;
        const { pdfId, pageOrder } = st.reorderDialog;
        st.setReorderDialog(null);
        st.setLoading(true);

        const reordered = await reorderPages(pdfId, pageOrder, fileName);
        if (reordered) showResult(t("tools.reorderResult", { name: reordered.original_filename }));
        else showResult(t("tools.reorderFailed"));
        st.setLoading(false);
        await reloadPdfs();
    }

    // ─── Remove Pages ────────────────────────────────────────────

    async function executeRemove(fileName?: string) {
        if (!st.nameDialog || st.nameDialog.type !== "remove") return;
        const { pdfId, selectedPages } = st.nameDialog.data;
        if (selectedPages.length === 0) return;
        st.setLoading(true);
        const result_pdf = await removePages(pdfId, selectedPages, fileName);
        if (result_pdf) showResult(t("tools.removeResult", { name: result_pdf.original_filename }));
        else showResult(t("tools.removeFailed"));
        st.setLoading(false);
        await reloadPdfs();
    }

    // ─── Metadata ────────────────────────────────────────────────

    async function saveMetadata() {
        if (!st.metadataDialog) return;
        const { pdfId, title, author } = st.metadataDialog;
        st.setMetadataDialog(null);
        st.setLoading(true);
        const result_pdf = await updateMetadata(pdfId, title || undefined, author || undefined);
        if (result_pdf) showResult(t("tools.metadataResult", { name: result_pdf.original_filename }));
        else showResult(t("tools.metadataFailed"));
        st.setLoading(false);
        await reloadPdfs();
    }

    // ─── Compress ────────────────────────────────────────────────

    async function executeCompress(fileName?: string) {
        if (!st.compressDialog) return;
        st.setLoading(true);
        // Online → cloud API (PyMuPDF, better quality). Offline → local re-save (pdf-lib).
        const result_pdf = st.isOnline
            ? await compressPdf(st.compressDialog.pdfId, st.compressQuality, fileName)
            : await compressPdfOffline(st.compressDialog.pdfId, st.compressQuality, fileName);
        if (result_pdf) showResult(t("tools.compressResult", { name: result_pdf.original_filename }));
        else showResult(t("tools.compressFailed"));
        st.setLoading(false);
        st.setCompressDialog(null);
        await reloadPdfs();
    }

    // ─── Import / Export ─────────────────────────────────────────

    async function executeImport() {
        if (!st.importExportDialog) return;
        st.setImportExportBusy(true);
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: "*/*",
                copyToCacheDirectory: true,
                multiple: false,
            });
            if (result.canceled || !result.assets?.[0]) return;
            const asset = result.assets[0];
            const imported = await importFile(asset.uri, asset.name || "document.txt", asset.mimeType || "application/octet-stream");
            if (imported) {
                showResult(t("tools.importResult", { name: imported.original_filename }));
                await reloadPdfs();
            } else {
                showResult(t("tools.importFailed"));
            }
        } catch (e) {
            console.error("Import error:", e);
            showResult(t("tools.importFailed"));
        } finally {
            st.setImportExportBusy(false);
            st.setImportExportDialog(null);
        }
    }

    async function executeExport() {
        if (!st.importExportDialog) return;
        st.setImportExportBusy(true);
        try {
            const result = await exportPdf(st.importExportDialog.pdfId, st.exportFormat, st.importExportDialog.pdfName);
            if (result) {
                showResult(t("tools.exportResult", { name: result.name }));
            } else {
                showResult(t("tools.exportFailed"));
            }
        } catch (e) {
            console.error("Export error:", e);
            showResult(t("tools.exportFailed"));
        } finally {
            st.setImportExportBusy(false);
            st.setImportExportDialog(null);
        }
    }

    // ─── Password ────────────────────────────────────────────────

    async function executeProtect() {
        if (!st.passwordDialog || st.passwordDialog.mode !== "protect") return;
        if (st.passwordInput.length < 4) { showResult(t("tools.passwordShort")); return; }
        if (st.passwordInput !== st.passwordConfirm) { showResult(t("tools.passwordMismatch")); return; }
        const { pdfId } = st.passwordDialog;
        st.setPasswordDialog(null);
        st.setLoading(true);
        const result_pdf = await protectPdf(pdfId, st.passwordInput);
        if (result_pdf) showResult(t("tools.protectResult", { name: result_pdf.original_filename }));
        else showResult(t("tools.protectFailed"));
        st.setLoading(false);
        await reloadPdfs();
    }

    async function executeUnlock() {
        if (!st.passwordDialog || st.passwordDialog.mode !== "unlock") return;
        if (!st.passwordInput) { showResult(t("tools.enterPassword")); return; }
        const { pdfId } = st.passwordDialog;
        st.setPasswordDialog(null);
        st.setLoading(true);
        const result_pdf = await unlockPdf(pdfId, st.passwordInput);
        if (result_pdf) showResult(t("tools.unlockResult", { name: result_pdf.original_filename }));
        else showResult(t("tools.unlockFailed"));
        st.setLoading(false);
        await reloadPdfs();
    }

    // ─── Sign / Annotate / OCR flow callbacks ────────────────────

    async function handleSigned(result: LocalPdf) {
        showResult(t("tools.signResult", { name: result.original_filename }));
        dlg.openRenameDialog(result);
        await reloadPdfs();
    }

    async function handleSignFailed() {
        showResult(t("tools.signFailed"));
        await reloadPdfs();
    }

    async function handleAnnotationSaved(result: LocalPdf) {
        showResult(t("tools.annotationResult", { name: result.original_filename }));
        dlg.openRenameDialog(result);
        await reloadPdfs();
    }

    async function handleAnnotationFailed() {
        showResult(t("tools.annotationFailed"));
        await reloadPdfs();
    }

    async function handleOcrDone(result: LocalPdf, characterCount: number, alreadySearchable: boolean) {
        const message = alreadySearchable
            ? t("tools.ocrResultAlreadySearchable")
            : characterCount > 0
                ? t("tools.ocrResultSuccess", { count: characterCount })
                : t("tools.ocrResultNoText");
        showResult(message);
        dlg.openRenameDialog(result);
        await reloadPdfs();
    }

    async function handleOcrFailed() {
        showResult(t("tools.ocrFailed"));
        await reloadPdfs();
    }

    // ─── Selection / item press ──────────────────────────────────

    const toggleSelect = useCallback((id: string) => {
        st.setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    }, []);

    // The open*Dialog functions above are plain (unmemoized) closures
    // recreated every render, so referencing them directly in handleItemPress's
    // deps would make it just as unstable. Reading them through a ref that's
    // kept current instead lets handleItemPress stay referentially stable
    // across every render that isn't a real `operation` change — including
    // the ones triggered by typing into an unrelated TextInput elsewhere on
    // this screen (e.g. the rename dialog), which otherwise forced a full
    // re-render of every visible FlatList row (see ToolsPdfListItem).
    const actionHandlersRef = useRef({
        openSplitDialog: dlg.openSplitDialog, openRemoveDialog: dlg.openRemoveDialog, openMetadataDialog: dlg.openMetadataDialog,
        openReorderDialog: dlg.openReorderDialog, openPasswordDialog: dlg.openPasswordDialog, openCompressDialog: dlg.openCompressDialog,
        openSignDialog: dlg.openSignDialog, openAnnotationDialog: dlg.openAnnotationDialog, openOcrDialog: dlg.openOcrDialog,
        openShareDialog: dlg.openShareDialog, openImportExportDialog: dlg.openImportExportDialog,
    });
    actionHandlersRef.current = {
        openSplitDialog: dlg.openSplitDialog, openRemoveDialog: dlg.openRemoveDialog, openMetadataDialog: dlg.openMetadataDialog,
        openReorderDialog: dlg.openReorderDialog, openPasswordDialog: dlg.openPasswordDialog, openCompressDialog: dlg.openCompressDialog,
        openSignDialog: dlg.openSignDialog, openAnnotationDialog: dlg.openAnnotationDialog, openOcrDialog: dlg.openOcrDialog,
        openShareDialog: dlg.openShareDialog, openImportExportDialog: dlg.openImportExportDialog,
    };

    const handleItemPress = useCallback((item: LocalPdf) => {
        const h = actionHandlersRef.current;
        if (st.operation === "merge") toggleSelect(item.id);
        else if (st.operation === "split") h.openSplitDialog(item.id);
        else if (st.operation === "compress") h.openCompressDialog(item.id);
        else if (st.operation === "reorder") h.openReorderDialog(item.id);
        else if (st.operation === "remove") h.openRemoveDialog(item.id);
        else if (st.operation === "metadata") h.openMetadataDialog(item.id);
        else if (st.operation === "protect") h.openPasswordDialog(item.id, "protect");
        else if (st.operation === "unlock") h.openPasswordDialog(item.id, "unlock");
        else if (st.operation === "sign") h.openSignDialog(item.id);
        else if (st.operation === "annotate") h.openAnnotationDialog(item.id);
        else if (st.operation === "ocr") h.openOcrDialog(item.id);
        else if (st.operation === "share") h.openShareDialog(item.id);
        else if (st.operation === "export") h.openImportExportDialog(item.id, "export");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [st.operation, toggleSelect]);

    return {
        handleMerge,
        executeMerge,
        executeSplit,
        executeRemove,
        saveMetadata,
        executeReorder,
        executeCompress,
        executeImport,
        executeExport,
        executeProtect,
        executeUnlock,
        handleSigned,
        handleSignFailed,
        handleAnnotationSaved,
        handleAnnotationFailed,
        handleOcrDone,
        handleOcrFailed,
        toggleSelect,
        handleItemPress,
    };
}