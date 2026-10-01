/**
 * State-owned slice of useToolsScreen (issue #885, A3a - split).
 * Owns theme, services, PDF list state and every dialog's state + setters,
 * plus the load/reload logic and the rename-dialog focus effect. Zero
 * behavior changes; composed back by useToolsScreen.
 */
import { useEffect, useRef, useCallback, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useTheme } from "react-native-paper";
import { usePdfStorage } from "./usePdfStorage";
import { useCloudSyncContext } from "./CloudSyncContext";
import { useTranslation } from "react-i18next";
import type { LocalPdf } from "../shared/types";
import type { MD3Theme } from "react-native-paper";

/** State shared with the split dialog types. */
export interface PageSelectDialogState {
    pdfId: string;
    pdfName: string;
    totalPages: number;
    selectedPages: number[];
}

/** Everything useToolsScreenState exposes to the sibling sub-hooks. */
export interface ToolsScreenStateCtx {
    theme: MD3Theme;
    loadLocalPdfs: ReturnType<typeof usePdfStorage>["loadLocalPdfs"];
    isOnline: ReturnType<typeof useCloudSyncContext>["isOnline"];
    t: ReturnType<typeof useTranslation>["t"];
    pdfs: LocalPdf[];
    setPdfs: (v: LocalPdf[]) => void;
    loading: boolean;
    setLoading: (v: boolean) => void;
    operation: string | null;
    setOperation: (v: string | null) => void;
    selectedIds: string[];
    setSelectedIds: Dispatch<SetStateAction<string[]>>;
    result: string;
    setResult: (v: string) => void;
    snackbarVisible: boolean;
    setSnackbarVisible: (v: boolean) => void;
    showResult: (msg: string) => void;
    reloadPdfs: () => Promise<void>;

    splitDialog: PageSelectDialogState | null;
    setSplitDialog: (v: PageSelectDialogState | null) => void;
    removeDialog: PageSelectDialogState | null;
    setRemoveDialog: (v: PageSelectDialogState | null) => void;
    reorderDialog: { pdfId: string; pdfName: string; pageOrder: number[] } | null;
    setReorderDialog: (v: { pdfId: string; pdfName: string; pageOrder: number[] } | null) => void;
    nameDialog: { type: "merge" | "split" | "reorder" | "remove"; data: any } | null;
    setNameDialog: (v: { type: "merge" | "split" | "reorder" | "remove"; data: any } | null) => void;
    nameInput: string;
    setNameInput: (v: string) => void;
    renamePdf: LocalPdf | null;
    setRenamePdf: (v: LocalPdf | null) => void;
    renameInput: string;
    setRenameInput: (v: string) => void;
    renameSelection: { start: number; end: number } | undefined;
    setRenameSelection: (v: { start: number; end: number } | undefined) => void;
    renameInputRef: any;
    compressDialog: { pdfId: string; pdfName: string } | null;
    setCompressDialog: (v: { pdfId: string; pdfName: string } | null) => void;
    compressQuality: "low" | "medium" | "high";
    setCompressQuality: (v: "low" | "medium" | "high") => void;
    compressNameInput: string;
    setCompressNameInput: (v: string) => void;
    importExportDialog: { mode: "import" | "export"; pdfId: string; pdfName: string } | null;
    setImportExportDialog: (v: { mode: "import" | "export"; pdfId: string; pdfName: string } | null) => void;
    exportFormat: string;
    setExportFormat: (v: string) => void;
    importExportBusy: boolean;
    setImportExportBusy: (v: boolean) => void;
    metadataDialog: { pdfId: string; pdfName: string; title: string; author: string } | null;
    setMetadataDialog: Dispatch<SetStateAction<{ pdfId: string; pdfName: string; title: string; author: string } | null>>;
    passwordDialog: { pdfId: string; pdfName: string; mode: "protect" | "unlock" } | null;
    setPasswordDialog: (v: { pdfId: string; pdfName: string; mode: "protect" | "unlock" } | null) => void;
    passwordInput: string;
    setPasswordInput: (v: string) => void;
    passwordConfirm: string;
    setPasswordConfirm: (v: string) => void;
    signDialog: { pdfId: string; pdfName: string; pdfUri: string; totalPages: number } | null;
    setSignDialog: (v: { pdfId: string; pdfName: string; pdfUri: string; totalPages: number } | null) => void;
    annotationDialog: { pdfId: string; pdfName: string; pdfUri: string; totalPages: number } | null;
    setAnnotationDialog: (v: { pdfId: string; pdfName: string; pdfUri: string; totalPages: number } | null) => void;
    ocrDialog: { pdfId: string; pdfName: string } | null;
    setOcrDialog: (v: { pdfId: string; pdfName: string } | null) => void;
    shareDialog: { pdfId: string; pdfName: string } | null;
    setShareDialog: (v: { pdfId: string; pdfName: string } | null) => void;
}

export function useToolsScreenState(): ToolsScreenStateCtx {
    const theme = useTheme();
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

    // Split dialog state
    const [splitDialog, setSplitDialog] = useState<PageSelectDialogState | null>(null);
    // Remove dialog state
    const [removeDialog, setRemoveDialog] = useState<PageSelectDialogState | null>(null);
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

    return {
        theme,
        loadLocalPdfs,
        isOnline,
        t,
        pdfs,
        setPdfs,
        loading,
        setLoading,
        operation,
        setOperation,
        selectedIds,
        setSelectedIds,
        result,
        setResult,
        snackbarVisible,
        setSnackbarVisible,
        showResult,
        reloadPdfs,
        splitDialog,
        setSplitDialog,
        removeDialog,
        setRemoveDialog,
        reorderDialog,
        setReorderDialog,
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
        setImportExportBusy,
        metadataDialog,
        setMetadataDialog,
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
    };
}