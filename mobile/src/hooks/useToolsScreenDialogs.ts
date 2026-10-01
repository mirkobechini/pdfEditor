/**
 * Dialog-openers slice of useToolsScreen (issue #885, A3a - split).
 * Owns every open*Dialog opener, page-toggling, page-moving and the
 * rename dialog (open/submit/focus). Zero behavior changes; composed back
 * by useToolsScreen.
 */
import type { LocalPdf } from "../shared/types";
import type { ToolsScreenStateCtx } from "./useToolsScreenState";
import { renamePdfLocally } from "../services/localDb";

export interface ToolsScreenDialogsCtx {
    openRenameDialog: (result: LocalPdf) => void;
    submitRename: () => Promise<void>;
    openSplitDialog: (pdfId: string) => void;
    toggleSplitPage: (page: number) => void;
    openRemoveDialog: (pdfId: string) => void;
    toggleRemovePage: (page: number) => void;
    openMetadataDialog: (pdfId: string) => void;
    openReorderDialog: (pdfId: string) => void;
    movePageUp: (index: number) => void;
    movePageDown: (index: number) => void;
    openPasswordDialog: (pdfId: string, mode: "protect" | "unlock") => void;
    openCompressDialog: (pdfId: string) => void;
    openImportExportDialog: (pdfId: string, mode: "import" | "export") => void;
    openSignDialog: (pdfId: string) => void;
    openAnnotationDialog: (pdfId: string) => void;
    openOcrDialog: (pdfId: string) => void;
    openShareDialog: (pdfId: string) => void;
}

export function useToolsScreenDialogs(st: ToolsScreenStateCtx): ToolsScreenDialogsCtx {

    async function submitRename() {
        if (!st.renamePdf) return;
        const trimmed = st.renameInput.trim();
        if (trimmed && trimmed !== st.renamePdf.original_filename) {
            await renamePdfLocally(st.renamePdf.id, trimmed);
            await st.reloadPdfs();
        }
        st.setRenamePdf(null);
        st.setRenameInput("");
        st.setRenameSelection(undefined);
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
            st.setRenameInput(result.original_filename);
            st.setRenameSelection({ start: result.original_filename.length, end: result.original_filename.length });
            st.setRenamePdf(result);
        }, 0);
    }

    function openSplitDialog(pdfId: string) {
        const pdf = st.pdfs.find((p) => p.id === pdfId);
        if (!pdf) return;
        st.setSplitDialog({
            pdfId,
            pdfName: pdf.original_filename,
            totalPages: pdf.page_count || 1,
            selectedPages: [],
        });
    }

    function toggleSplitPage(page: number) {
        if (!st.splitDialog) return;
        const selected = st.splitDialog.selectedPages.includes(page)
            ? st.splitDialog.selectedPages.filter((p) => p !== page)
            : [...st.splitDialog.selectedPages, page];
        st.setSplitDialog({ ...st.splitDialog, selectedPages: selected });
    }

    function openRemoveDialog(pdfId: string) {
        const pdf = st.pdfs.find((p) => p.id === pdfId);
        if (!pdf) return;
        st.setRemoveDialog({
            pdfId,
            pdfName: pdf.original_filename,
            totalPages: pdf.page_count || 1,
            selectedPages: [],
        });
    }

    function toggleRemovePage(page: number) {
        if (!st.removeDialog) return;
        const selected = st.removeDialog.selectedPages.includes(page)
            ? st.removeDialog.selectedPages.filter((p) => p !== page)
            : [...st.removeDialog.selectedPages, page];
        st.setRemoveDialog({ ...st.removeDialog, selectedPages: selected });
    }

    function openMetadataDialog(pdfId: string) {
        const pdf = st.pdfs.find((p) => p.id === pdfId);
        if (!pdf) return;
        st.setMetadataDialog({
            pdfId,
            pdfName: pdf.original_filename,
            title: pdf.title || "",
            author: pdf.author || "",
        });
    }

    function openReorderDialog(pdfId: string) {
        const pdf = st.pdfs.find((p) => p.id === pdfId);
        if (!pdf || !pdf.page_count) return;
        const pages: number[] = [];
        for (let i = 1; i <= pdf.page_count; i++) pages.push(i);
        st.setReorderDialog({
            pdfId,
            pdfName: pdf.original_filename,
            pageOrder: pages,
        });
    }

    function movePageUp(index: number) {
        if (!st.reorderDialog || index === 0) return;
        const order = [...st.reorderDialog.pageOrder];
        [order[index - 1], order[index]] = [order[index], order[index - 1]];
        st.setReorderDialog({ ...st.reorderDialog, pageOrder: order });
    }

    function movePageDown(index: number) {
        if (!st.reorderDialog || index >= st.reorderDialog.pageOrder.length - 1) return;
        const order = [...st.reorderDialog.pageOrder];
        [order[index], order[index + 1]] = [order[index + 1], order[index]];
        st.setReorderDialog({ ...st.reorderDialog, pageOrder: order });
    }

    function openPasswordDialog(pdfId: string, mode: "protect" | "unlock") {
        st.setPasswordDialog({ pdfId, pdfName: st.pdfs.find((p) => p.id === pdfId)?.original_filename || "PDF", mode });
        st.setPasswordInput("");
        st.setPasswordConfirm("");
    }

    function openCompressDialog(pdfId: string) {
        const pdf = st.pdfs.find((p) => p.id === pdfId);
        if (!pdf) return;
        st.setCompressDialog({ pdfId, pdfName: pdf.original_filename });
    }

    function openImportExportDialog(pdfId: string, mode: "import" | "export") {
        const pdf = st.pdfs.find((p) => p.id === pdfId);
        st.setImportExportDialog({ mode, pdfId, pdfName: pdf?.original_filename || "PDF" });
        st.setExportFormat("txt");
    }

    function openSignDialog(pdfId: string) {
        const pdf = st.pdfs.find((p) => p.id === pdfId);
        if (!pdf) return;
        st.setSignDialog({ pdfId, pdfName: pdf.original_filename, pdfUri: pdf.uri, totalPages: pdf.page_count || 1 });
    }

    function openAnnotationDialog(pdfId: string) {
        const pdf = st.pdfs.find((p) => p.id === pdfId);
        if (!pdf) return;
        st.setAnnotationDialog({ pdfId, pdfName: pdf.original_filename, pdfUri: pdf.uri, totalPages: pdf.page_count || 1 });
    }

    function openOcrDialog(pdfId: string) {
        const pdf = st.pdfs.find((p) => p.id === pdfId);
        if (!pdf) return;
        st.setOcrDialog({ pdfId, pdfName: pdf.original_filename });
    }

    function openShareDialog(pdfId: string) {
        const pdf = st.pdfs.find((p) => p.id === pdfId);
        if (!pdf) return;
        st.setShareDialog({ pdfId, pdfName: pdf.original_filename });
    }

    return {
        openRenameDialog,
        submitRename,
        openSplitDialog,
        toggleSplitPage,
        openRemoveDialog,
        toggleRemovePage,
        openMetadataDialog,
        openReorderDialog,
        movePageUp,
        movePageDown,
        openPasswordDialog,
        openCompressDialog,
        openImportExportDialog,
        openSignDialog,
        openAnnotationDialog,
        openOcrDialog,
        openShareDialog,
    };
}