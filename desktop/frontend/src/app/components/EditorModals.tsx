// Modali dell'editor desktop — estratta da app/app/page.tsx (issue #881, T7).
// Raggruppa tutte le finestre modali (elimina pagine, riordina, unite, dividi,
// comprimi, import/export, firma, OCR, stampa, annota, condividi, blocco,
// metadati, sostituisci testo) per ridurre il page.tsx.

import RemovePagesModal from "../../components/RemovePagesModal";
import ReorderPagesModal from "../../components/ReorderPagesModal";
import MergeModal from "../../components/MergeModal";
import SplitPagesModal from "../../components/SplitPagesModal";
import CompressModal from "../../components/CompressModal";
import ImportExportModal from "../../components/ImportExportModal";
import SignModal from "../../components/SignModal";
import OcrModal from "../../components/OcrModal";
import PrintOptionsModal, { type PrintOptions } from "../../components/PrintOptionsModal";
import AnnotationDialog from "../../components/AnnotationDialog";
import ShareDialog from "../../components/ShareDialog";
import LockUnlockModal from "../../components/LockUnlockModal";
import MetadataModal from "../../components/MetadataModal";
import ReplaceTextModal from "../../components/ReplaceTextModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import type { PdfDocument } from "../../shared/types";

export type EditorModalsProps = {
    te: (k: string, values?: Record<string, string | number | Date>) => string;
    selectedDoc: PdfDocument | null;
    pdfUrl: string | null;
    currentPage: number;
    // open flags
    removePagesOpen: boolean;
    reorderOpen: boolean;
    splitOpen: boolean;
    mergeOpen: boolean;
    compressOpen: boolean;
    importExportOpen: boolean;
    signOpen: boolean;
    ocrOpen: boolean;
    printOptionsOpen: boolean;
    annotateOpen: boolean;
    shareOpen: boolean;
    lockOpen: boolean;
    replaceTextOpen: boolean;
    metadataOpen: boolean;
    deleteConfirm: string | null;
    // close handlers
    onCloseRemovePages: () => void;
    onCloseReorder: () => void;
    onCloseSplit: () => void;
    onCloseMerge: () => void;
    onCloseCompress: () => void;
    onCloseImportExport: () => void;
    onCloseSign: () => void;
    onCloseOcr: () => void;
    onClosePrintOptions: () => void;
    onCloseAnnotate: () => void;
    onCloseShare: () => void;
    onCloseLock: () => void;
    onCloseReplaceText: () => void;
    onCloseMetadata: () => void;
    onCancelDelete: () => void;
    onConfirmDelete: () => void;
    // save handlers
    onDocUpdated: (updatedDoc: PdfDocument) => void;
    onSplitSaved: (newDocs: PdfDocument[]) => void;
    onNewDocSaved: (newDoc: PdfDocument) => void;
    onSignSaved: (updatedDoc: PdfDocument) => void;
    onRefresh: () => void;
    onPrintConfirm: (options: PrintOptions) => void;
};

export function EditorModals(props: EditorModalsProps) {
    const {
        te, selectedDoc, pdfUrl, currentPage,
        removePagesOpen, reorderOpen, splitOpen, mergeOpen, compressOpen,
        importExportOpen, signOpen, ocrOpen, printOptionsOpen, annotateOpen,
        shareOpen, lockOpen, replaceTextOpen, metadataOpen, deleteConfirm,
        onCloseRemovePages, onCloseReorder, onCloseSplit, onCloseMerge, onCloseCompress,
        onCloseImportExport, onCloseSign, onCloseOcr, onClosePrintOptions, onCloseAnnotate,
        onCloseShare, onCloseLock, onCloseReplaceText, onCloseMetadata,
        onCancelDelete, onConfirmDelete,
        onDocUpdated, onSplitSaved, onNewDocSaved, onSignSaved,
        onRefresh, onPrintConfirm,
    } = props;

    const pdfId = selectedDoc?.id ?? "";
    const pdfName = selectedDoc?.original_filename ?? "";
    const totalPages = selectedDoc?.page_count ?? 0;

    return (
        <>
            <RemovePagesModal
                open={removePagesOpen}
                pdfId={pdfId}
                pdfName={pdfName}
                totalPages={totalPages}
                pdfUrl={pdfUrl}
                onClose={onCloseRemovePages}
                onSaved={onDocUpdated}
            />

            <ReorderPagesModal
                open={reorderOpen}
                pdfId={pdfId}
                pdfName={pdfName}
                totalPages={totalPages}
                pdfUrl={pdfUrl}
                onClose={onCloseReorder}
                onSaved={onDocUpdated}
            />

            <MergeModal
                open={mergeOpen}
                pdfId={pdfId}
                pdfName={pdfName}
                onClose={onCloseMerge}
                onSaved={onDocUpdated}
            />

            <SplitPagesModal
                open={splitOpen}
                pdfId={pdfId}
                pdfName={pdfName}
                totalPages={totalPages}
                pdfUrl={pdfUrl}
                onClose={onCloseSplit}
                onSaved={onSplitSaved}
            />

            <CompressModal
                open={compressOpen}
                pdfId={pdfId}
                pdfName={pdfName}
                onClose={onCloseCompress}
                onSaved={onNewDocSaved}
            />

            <ImportExportModal
                open={importExportOpen}
                pdfId={pdfId}
                pdfName={pdfName}
                onClose={onCloseImportExport}
                onImported={onNewDocSaved}
            />

            <SignModal
                open={signOpen}
                pdfId={pdfId}
                pdfName={pdfName}
                totalPages={selectedDoc?.page_count ?? 1}
                pdfUrl={pdfUrl}
                onClose={onCloseSign}
                onSaved={onSignSaved}
            />

            <OcrModal
                open={ocrOpen}
                pdfId={selectedDoc?.id ?? null}
                onClose={onCloseOcr}
                onSuccess={onRefresh}
            />

            <PrintOptionsModal
                open={printOptionsOpen}
                onClose={onClosePrintOptions}
                onConfirm={onPrintConfirm}
                pdfUrl={pdfUrl}
                initialPage={currentPage}
                totalPages={selectedDoc?.page_count ?? 1}
            />

            <AnnotationDialog
                open={annotateOpen}
                pdfId={selectedDoc?.id ?? null}
                currentPage={currentPage}
                pdfUrl={pdfUrl}
                onClose={onCloseAnnotate}
                onSuccess={onRefresh}
            />

            <ShareDialog
                open={shareOpen}
                pdfId={selectedDoc?.id ?? null}
                onClose={onCloseShare}
            />

            <LockUnlockModal
                open={lockOpen}
                pdfId={pdfId}
                pdfName={pdfName}
                isProtected={selectedDoc?.is_password_protected ?? false}
                onClose={onCloseLock}
                onSaved={onDocUpdated}
            />

            <MetadataModal
                open={metadataOpen}
                pdfId={pdfId}
                pdfName={pdfName}
                onClose={onCloseMetadata}
                onSaved={onDocUpdated}
            />

            <ReplaceTextModal
                open={replaceTextOpen}
                onClose={onCloseReplaceText}
                pdfId={selectedDoc?.id ?? null}
                onSuccess={onDocUpdated}
            />

            <DeleteConfirmModal
                te={te}
                deleteConfirmId={deleteConfirm}
                onCancel={onCancelDelete}
                onConfirm={onConfirmDelete}
            />
        </>
    );
}