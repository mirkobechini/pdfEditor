/**
 * Hook extracted from ToolsScreen (issue #885, A3a - step 1).
 * Owns all ToolsScreen state, action handlers and progress flags so the
 * screen component stays a thin renderer. Zero behavior changes.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import * as DocumentPicker from "expo-document-picker";
import { usePdfStorage } from "./usePdfStorage";
import { mergePdfs, splitPdf, reorderPages, removePages, updateMetadata, protectPdf, unlockPdf, compressPdf, compressPdfOffline, exportPdf, importFile } from "../services/pdfService";
import { renamePdfLocally } from "../services/localDb";
import { useCloudSyncContext } from "./CloudSyncContext";
import { useTranslation } from "react-i18next";
import type { LocalPdf } from "../shared/types";

export function useToolsScreen() {
    const { loadLocalPdfs } = usePdfStorage();
    const { isOnline } = useCloudSyncContext();
    const { t } = useTranslation();
    const [pdfs, setPdfs] = useState<LocalPdf[]>([]);
    const [loading, setLoading] = useState(true);
    const [operation, setOperation] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [result, setResult] = useState("");
    const [snackbarVisible, setSnackbarVisible] = useState(false);

    function showResult(msg: string) {
        setResult(msg);
        setSnackbarVisible(true);
    }

    async function submitRename() {
        if (!renamePdf) return;
        const trimmed = renameInput.trim();
        if (trimmed && trimmed !== renamePdf.original_filename) {
            await renamePdfLocally(renamePdf.id, trimmed);
            await reloadPdfs();
        }
        setRenamePdf(null);
        setRenameInput("");
        setRenameSelection(undefined);
    }

    // The *FlowDialog that just saved (Sign/Annotation/OCR) calls onSaved(...)
    // and then onDismiss() in the same synchronous tick — onDismiss unmounts
    // that dialog's whole component tree. Opening the rename dialog directly
    // from onSaved put its TextInput's mount in the SAME React commit as that
    // unmount. AnnotationFlowDialog's tree (radio buttons, color swatches, a
    // page field, the PDF preview with its gesture responders) is by far the
    // heaviest of the three — which is exactly why keystrokes only broke
    // there and not after sign/OCR. Deferring by a tick lets the closing
    // dialog's unmount finish its own commit first.
    function openRenameDialog(result: LocalPdf) {
        setTimeout(() => {
            setRenameInput(result.original_filename);
            setRenameSelection({ start: result.original_filename.length, end: result.original_filename.length });
            setRenamePdf(result);
        }, 0);
    }

    // Split dialog state
    const [splitDialog, setSplitDialog] = useState<{ pdfId: string; pdfName: string; totalPages: number; selectedPages: number[] } | null>(null);
    // Remove dialog state
    const [removeDialog, setRemoveDialog] = useState<{ pdfId: string; pdfName: string; totalPages: number; selectedPages: number[] } | null>(null);
    // Reorder dialog state
    const [reorderDialog, setReorderDialog] = useState<{ pdfId: string; pdfName: string; pageOrder: number[] } | null>(null);
    // Name dialog state
    const [nameDialog, setNameDialog] = useState<{ type: "merge" | "split" | "reorder" | "remove"; data: any } | null>(null);
    const [nameInput, setNameInput] = useState("");
    // Rename-after-action dialog state (sign/annotate/OCR results)
    const [renamePdf, setRenamePdf] = useState<LocalPdf | null>(null);
    const [renameInput, setRenameInput] = useState("");
    // Explicit cursor tracking: without a controlled `selection`, Android
    // re-guesses where to put the cursor after every value update, and that
    // guess can land a character off — typing "ciao" without watching could
    // come out "cioa", or holding backspace near a given spot deletes past
    // the intended character. Controlling `selection` ourselves (updated via
    // onSelectionChange) removes the guesswork entirely.
    const [renameSelection, setRenameSelection] = useState<{ start: number; end: number } | undefined>(undefined);
    const renameInputRef = useRef<any>(null);

    // `autoFocus` grabbed the keyboard while react-native-paper's Dialog was
    // still mid entrance-animation (a Portal/Modal fade+scale) — on Android
    // that race dropped or misplaced early keystrokes. Focusing manually
    // once the dialog has had time to settle avoids it.
    useEffect(() => {
        if (renamePdf) {
            const timer = setTimeout(() => renameInputRef.current?.focus(), 300);
            return () => clearTimeout(timer);
        }
    }, [renamePdf]);
    // Compress dialog state
    const [compressDialog, setCompressDialog] = useState<{ pdfId: string; pdfName: string } | null>(null);
    const [compressQuality, setCompressQuality] = useState<"low" | "medium" | "high">("medium");
    const [compressNameInput, setCompressNameInput] = useState("");
    // Import/Export dialog state
    const [importExportDialog, setImportExportDialog] = useState<{ mode: "import" | "export"; pdfId: string; pdfName: string } | null>(null);
    const [exportFormat, setExportFormat] = useState("txt");
    const [importExportBusy, setImportExportBusy] = useState(false);
    // Metadata dialog state
    const [metadataDialog, setMetadataDialog] = useState<{ pdfId: string; pdfName: string; title: string; author: string } | null>(null);
    // Password dialog state
    const [passwordDialog, setPasswordDialog] = useState<{ pdfId: string; pdfName: string; mode: "protect" | "unlock" } | null>(null);
    // Sign dialog state
    const [signDialog, setSignDialog] = useState<{ pdfId: string; pdfName: string; pdfUri: string; totalPages: number } | null>(null);
    // Annotation dialog state
    const [annotationDialog, setAnnotationDialog] = useState<{ pdfId: string; pdfName: string; pdfUri: string; totalPages: number } | null>(null);
    // OCR dialog state
    const [ocrDialog, setOcrDialog] = useState<{ pdfId: string; pdfName: string } | null>(null);
    // Share dialog state
    const [shareDialog, setShareDialog] = useState<{ pdfId: string; pdfName: string } | null>(null);
    const [passwordInput, setPasswordInput] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");

    useEffect(() => {
        loadLocalPdfs().then(setPdfs).finally(() => setLoading(false));
    }, []);

    const reloadPdfs = useCallback(async () => {
        const updated = await loadLocalPdfs();
        setPdfs(updated);
    }, [loadLocalPdfs]);

    async function handleMerge() {
        if (selectedIds.length < 2) { showResult(t("tools.selectMin2")); return; }
        // Ask for file name before merging
        setNameDialog({ type: "merge", data: { ids: [...selectedIds] } });
    }

    async function executeMerge(fileName?: string) {
        if (!nameDialog) return;
        const { ids } = nameDialog.data;
        setNameDialog(null);
        setLoading(true);
        const merged = await mergePdfs(ids, fileName);
        if (merged) {
            showResult(t("tools.mergeResult", { name: merged.original_filename }));
            setSelectedIds([]);
            await reloadPdfs();
        } else showResult(t("tools.mergeFailed"));
        setLoading(false);
    }

    // ─── Split ────────────────────────────────────────────────────

    function openSplitDialog(pdfId: string) {
        const pdf = pdfs.find((p) => p.id === pdfId);
        if (!pdf) return;
        setSplitDialog({
            pdfId,
            pdfName: pdf.original_filename,
            totalPages: pdf.page_count || 1,
            selectedPages: [],
        });
    }

    function toggleSplitPage(page: number) {
        if (!splitDialog) return;
        const selected = splitDialog.selectedPages.includes(page)
            ? splitDialog.selectedPages.filter((p) => p !== page)
            : [...splitDialog.selectedPages, page];
        setSplitDialog({ ...splitDialog, selectedPages: selected });
    }

    function openRemoveDialog(pdfId: string) {
        const pdf = pdfs.find((p) => p.id === pdfId);
        if (!pdf) return;
        setRemoveDialog({
            pdfId,
            pdfName: pdf.original_filename,
            totalPages: pdf.page_count || 1,
            selectedPages: [],
        });
    }

    function toggleRemovePage(page: number) {
        if (!removeDialog) return;
        const selected = removeDialog.selectedPages.includes(page)
            ? removeDialog.selectedPages.filter((p) => p !== page)
            : [...removeDialog.selectedPages, page];
        setRemoveDialog({ ...removeDialog, selectedPages: selected });
    }

    // ─── Metadata ────────────────────────────────────────────────

    function openMetadataDialog(pdfId: string) {
        const pdf = pdfs.find((p) => p.id === pdfId);
        if (!pdf) return;
        setMetadataDialog({
            pdfId,
            pdfName: pdf.original_filename,
            title: pdf.title || "",
            author: pdf.author || "",
        });
    }

    async function saveMetadata() {
        if (!metadataDialog) return;
        const { pdfId, title, author } = metadataDialog;
        setMetadataDialog(null);
        setLoading(true);
        const result_pdf = await updateMetadata(pdfId, title || undefined, author || undefined);
        if (result_pdf) showResult(t("tools.metadataResult", { name: result_pdf.original_filename }));
        else showResult(t("tools.metadataFailed"));
        setLoading(false);
        await reloadPdfs();
    }

    async function executeSplit(fileName?: string) {
        if (!nameDialog) return;
        const { pdfId, totalPages, selectedPages } = nameDialog.data;
        setSplitDialog(null);
        setLoading(true);

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
        setLoading(false);
        await reloadPdfs();
    }

    // ─── Reorder ──────────────────────────────────────────────────

    function openReorderDialog(pdfId: string) {
        const pdf = pdfs.find((p) => p.id === pdfId);
        if (!pdf || !pdf.page_count) return;
        const pages: number[] = [];
        for (let i = 1; i <= pdf.page_count; i++) pages.push(i);
        setReorderDialog({
            pdfId,
            pdfName: pdf.original_filename,
            pageOrder: pages,
        });
    }

    function movePageUp(index: number) {
        if (!reorderDialog || index === 0) return;
        const order = [...reorderDialog.pageOrder];
        [order[index - 1], order[index]] = [order[index], order[index - 1]];
        setReorderDialog({ ...reorderDialog, pageOrder: order });
    }

    function movePageDown(index: number) {
        if (!reorderDialog || index >= reorderDialog.pageOrder.length - 1) return;
        const order = [...reorderDialog.pageOrder];
        [order[index], order[index + 1]] = [order[index + 1], order[index]];
        setReorderDialog({ ...reorderDialog, pageOrder: order });
    }

    async function executeReorder(fileName?: string) {
        if (!reorderDialog) return;
        const { pdfId, pageOrder } = reorderDialog;
        setReorderDialog(null);
        setLoading(true);

        const reordered = await reorderPages(pdfId, pageOrder, fileName);
        if (reordered) showResult(t("tools.reorderResult", { name: reordered.original_filename }));
        else showResult(t("tools.reorderFailed"));
        setLoading(false);
        await reloadPdfs();
    }

    // ─── Remove Pages ────────────────────────────────────────────

    async function executeRemove(fileName?: string) {
        if (!nameDialog || nameDialog.type !== "remove") return;
        const { pdfId, selectedPages } = nameDialog.data;
        if (selectedPages.length === 0) return;
        setLoading(true);
        const result_pdf = await removePages(pdfId, selectedPages, fileName);
        if (result_pdf) showResult(t("tools.removeResult", { name: result_pdf.original_filename }));
        else showResult(t("tools.removeFailed"));
        setLoading(false);
        await reloadPdfs();
    }

    function openPasswordDialog(pdfId: string, mode: "protect" | "unlock") {
        setPasswordDialog({ pdfId, pdfName: pdfs.find((p) => p.id === pdfId)?.original_filename || "PDF", mode });
        setPasswordInput("");
        setPasswordConfirm("");
    }

    // ─── Compress ────────────────────────────────────────────────

    function openCompressDialog(pdfId: string) {
        const pdf = pdfs.find((p) => p.id === pdfId);
        if (!pdf) return;
        setCompressDialog({ pdfId, pdfName: pdf.original_filename });
    }

    async function executeCompress(fileName?: string) {
        if (!compressDialog) return;
        setLoading(true);
        // Online → cloud API (PyMuPDF, better quality). Offline → local re-save (pdf-lib).
        const result_pdf = isOnline
            ? await compressPdf(compressDialog.pdfId, compressQuality, fileName)
            : await compressPdfOffline(compressDialog.pdfId, compressQuality, fileName);
        if (result_pdf) showResult(t("tools.compressResult", { name: result_pdf.original_filename }));
        else showResult(t("tools.compressFailed"));
        setLoading(false);
        setCompressDialog(null);
        await reloadPdfs();
    }

    // ─── Import / Export ─────────────────────────────────────────

    function openImportExportDialog(pdfId: string, mode: "import" | "export") {
        const pdf = pdfs.find((p) => p.id === pdfId);
        setImportExportDialog({ mode, pdfId, pdfName: pdf?.original_filename || "PDF" });
        setExportFormat("txt");
    }

    // ─── Sign ───────────────────────────────────────────────────

    function openSignDialog(pdfId: string) {
        const pdf = pdfs.find((p) => p.id === pdfId);
        if (!pdf) return;
        setSignDialog({ pdfId, pdfName: pdf.original_filename, pdfUri: pdf.uri, totalPages: pdf.page_count || 1 });
    }

    async function handleSigned(result: LocalPdf) {
        showResult(t("tools.signResult", { name: result.original_filename }));
        openRenameDialog(result);
        await reloadPdfs();
    }

    async function handleSignFailed() {
        showResult(t("tools.signFailed"));
        await reloadPdfs();
    }

    // ─── Annotate ───────────────────────────────────────────────

    function openAnnotationDialog(pdfId: string) {
        const pdf = pdfs.find((p) => p.id === pdfId);
        if (!pdf) return;
        setAnnotationDialog({ pdfId, pdfName: pdf.original_filename, pdfUri: pdf.uri, totalPages: pdf.page_count || 1 });
    }

    async function handleAnnotationSaved(result: LocalPdf) {
        showResult(t("tools.annotationResult", { name: result.original_filename }));
        openRenameDialog(result);
        await reloadPdfs();
    }

    async function handleAnnotationFailed() {
        showResult(t("tools.annotationFailed"));
        await reloadPdfs();
    }

    // ─── OCR ────────────────────────────────────────────────────

    function openOcrDialog(pdfId: string) {
        const pdf = pdfs.find((p) => p.id === pdfId);
        if (!pdf) return;
        setOcrDialog({ pdfId, pdfName: pdf.original_filename });
    }

    async function handleOcrDone(result: LocalPdf, characterCount: number, alreadySearchable: boolean) {
        const message = alreadySearchable
            ? t("tools.ocrResultAlreadySearchable")
            : characterCount > 0
                ? t("tools.ocrResultSuccess", { count: characterCount })
                : t("tools.ocrResultNoText");
        showResult(message);
        openRenameDialog(result);
        await reloadPdfs();
    }

    async function handleOcrFailed() {
        showResult(t("tools.ocrFailed"));
        await reloadPdfs();
    }

    // ─── Share ──────────────────────────────────────────────────

    function openShareDialog(pdfId: string) {
        const pdf = pdfs.find((p) => p.id === pdfId);
        if (!pdf) return;
        setShareDialog({ pdfId, pdfName: pdf.original_filename });
    }

    async function executeImport() {
        if (!importExportDialog) return;
        setImportExportBusy(true);
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
            setImportExportBusy(false);
            setImportExportDialog(null);
        }
    }

    async function executeExport() {
        if (!importExportDialog) return;
        setImportExportBusy(true);
        try {
            const result = await exportPdf(importExportDialog.pdfId, exportFormat, importExportDialog.pdfName);
            if (result) {
                showResult(t("tools.exportResult", { name: result.name }));
            } else {
                showResult(t("tools.exportFailed"));
            }
        } catch (e) {
            console.error("Export error:", e);
            showResult(t("tools.exportFailed"));
        } finally {
            setImportExportBusy(false);
            setImportExportDialog(null);
        }
    }

    async function executeProtect() {
        if (!passwordDialog || passwordDialog.mode !== "protect") return;
        if (passwordInput.length < 4) { showResult(t("tools.passwordShort")); return; }
        if (passwordInput !== passwordConfirm) { showResult(t("tools.passwordMismatch")); return; }
        const { pdfId } = passwordDialog;
        setPasswordDialog(null);
        setLoading(true);
        const result_pdf = await protectPdf(pdfId, passwordInput);
        if (result_pdf) showResult(t("tools.protectResult", { name: result_pdf.original_filename }));
        else showResult(t("tools.protectFailed"));
        setLoading(false);
        await reloadPdfs();
    }

    async function executeUnlock() {
        if (!passwordDialog || passwordDialog.mode !== "unlock") return;
        if (!passwordInput) { showResult(t("tools.enterPassword")); return; }
        const { pdfId } = passwordDialog;
        setPasswordDialog(null);
        setLoading(true);
        const result_pdf = await unlockPdf(pdfId, passwordInput);
        if (result_pdf) showResult(t("tools.unlockResult", { name: result_pdf.original_filename }));
        else showResult(t("tools.unlockFailed"));
        setLoading(false);
        await reloadPdfs();
    }

    const toggleSelect = useCallback((id: string) => {
        setSelectedIds((prev) =>
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
        openSplitDialog, openRemoveDialog, openMetadataDialog, openReorderDialog,
        openPasswordDialog, openCompressDialog, openSignDialog, openAnnotationDialog,
        openOcrDialog, openShareDialog, openImportExportDialog,
    });
    actionHandlersRef.current = {
        openSplitDialog, openRemoveDialog, openMetadataDialog, openReorderDialog,
        openPasswordDialog, openCompressDialog, openSignDialog, openAnnotationDialog,
        openOcrDialog, openShareDialog, openImportExportDialog,
    };

    const handleItemPress = useCallback((item: LocalPdf) => {
        const h = actionHandlersRef.current;
        if (operation === "merge") toggleSelect(item.id);
        else if (operation === "split") h.openSplitDialog(item.id);
        else if (operation === "compress") h.openCompressDialog(item.id);
        else if (operation === "reorder") h.openReorderDialog(item.id);
        else if (operation === "remove") h.openRemoveDialog(item.id);
        else if (operation === "metadata") h.openMetadataDialog(item.id);
        else if (operation === "protect") h.openPasswordDialog(item.id, "protect");
        else if (operation === "unlock") h.openPasswordDialog(item.id, "unlock");
        else if (operation === "sign") h.openSignDialog(item.id);
        else if (operation === "annotate") h.openAnnotationDialog(item.id);
        else if (operation === "ocr") h.openOcrDialog(item.id);
        else if (operation === "share") h.openShareDialog(item.id);
        else if (operation === "export") h.openImportExportDialog(item.id, "export");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [operation, toggleSelect]);

    return {
        // data & progress
        pdfs,
        loading,
        operation,
        selectedIds,
        result,
        snackbarVisible,
        isOnline,
        // setters used by the renderer
        setOperation,
        setSelectedIds,
        setSnackbarVisible,
        // selection
        toggleSelect,
        handleItemPress,
        // actions
        handleMerge,
        // dialogs
        splitDialog,
        setSplitDialog,
        toggleSplitPage,
        removeDialog,
        setRemoveDialog,
        toggleRemovePage,
        reorderDialog,
        setReorderDialog,
        movePageUp,
        movePageDown,
        metadataDialog,
        setMetadataDialog,
        saveMetadata,
        compressDialog,
        setCompressDialog,
        compressQuality,
        setCompressQuality,
        compressNameInput,
        setCompressNameInput,
        importExportDialog,
        setImportExportDialog,
        exportFormat,
        setExportFormat,
        importExportBusy,
        passwordDialog,
        setPasswordDialog,
        passwordInput,
        setPasswordInput,
        passwordConfirm,
        setPasswordConfirm,
        signDialog,
        setSignDialog,
        annotationDialog,
        setAnnotationDialog,
        ocrDialog,
        setOcrDialog,
        shareDialog,
        setShareDialog,
        nameDialog,
        setNameDialog,
        nameInput,
        setNameInput,
        renamePdf,
        setRenamePdf,
        renameInput,
        setRenameInput,
        renameSelection,
        setRenameSelection,
        renameInputRef,
        submitRename,
        // execution resolvers used by the name dialog
        executeMerge,
        executeSplit,
        executeReorder,
        executeRemove,
        executeCompress,
        executeImport,
        executeExport,
        executeProtect,
        executeUnlock,
        // flow dialog callbacks
        handleSigned,
        handleSignFailed,
        handleAnnotationSaved,
        handleAnnotationFailed,
        handleOcrDone,
        handleOcrFailed,
    };
}