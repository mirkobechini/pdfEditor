import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import React from "react";
import EditorPage from "../page";

// ─── Mocks ────────────────────────────────────────────────────────

const mockListPdfs = vi.fn();
const mockDownloadPdf = vi.fn();
const mockUploadPdf = vi.fn();
const mockImportFile = vi.fn();
const mockDeletePdf = vi.fn();
const mockUpdateMetadata = vi.fn();
const mockRefreshCsrf = vi.fn();
const mockTauriInvoke = vi.fn();

let mockUser: any = { id: "u1", email: "test@test.com", full_name: "Test User", license_tier: "pro" };
let mockPrefs: any = { language: "it", default_zoom: 100, default_save_folder: "" };
let mockSyncStatus: Record<string, string> = {};
let mockIsTauri = false;

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => {
        const map: Record<string, string> = {
            openLocalPdf: "Apri PDF",
            recentDocuments: "Documenti recenti",
            noDocuments: "Nessun documento",
            deletePdf: "Elimina",
            cloudSync: "Cloud Sync",
            settings: "Impostazioni",
            user: "Utente",
            license: "Licenza",
            edit: "Modifica",
            download: "Scarica",
            merge: "Unisci",
            split: "Dividi",
            reorder: "Riordina",
            remove: "Rimuovi",
            metadata: "Metadati",
            dropToUpload: "Rilascia per caricare",
            pdfLocked: "PDF protetto",
            pdfLockedDesc: "Inserisci password",
            unlockPdf: "Sblocca PDF",
            selectPdf: "Seleziona un PDF",
            pageMetadata: "Metadati pagina",
            filename: "Nome file",
            size: "Dimensione",
            pages: "Pagine",
            created: "Creato",
            noPdfSelected: "Nessun PDF selezionato",
            sidecarOnline: "Sidecar online",
            encoding: "UTF-8",
            database: "SQLite",
            pdfEngine: "PyMuPDF",
            deleteConfirmTitle: "Conferma eliminazione",
            deleteConfirmDesc: "Sei sicuro?",
            cancel: "Annulla",
            delete: "Elimina",
            bytes: "B",
            kilobytes: "KB",
            megabytes: "MB",
            minutesAgo: "m fa",
            hoursAgo: "h fa",
            daysAgo: "g fa",
            print: "Stampa",
            sign: "Firma",
            ocr: "OCR",
            annotate: "Annota",
            share: "Condividi",
            importExport: "Importa/Esporta",
            select: "Seleziona",
            done: "Fine",
            selectAll: "Seleziona tutti",
            deselectAll: "Deseleziona tutti",
            selected: "selezionati",
            deleteSelected: "Elimina selezionati",
            exportSelected: "Esporta selezionati",
        };
        return map[key] || key;
    },
}));

vi.mock("../../../shared/auth", () => ({
    useAuth: () => ({ user: mockUser }),
}));

vi.mock("../../../shared/tauri", () => ({
    isTauri: () => mockIsTauri,
    getApiBaseUrl: () => "http://127.0.0.1:7723",
    tauriInvoke: (...args: any[]) => mockTauriInvoke(...args),
}));

// Mock Tauri webview drag-drop API
const mockOnDragDropEvent = vi.fn();
vi.mock("@tauri-apps/api/webview", () => ({
    getCurrentWebview: () => ({
        onDragDropEvent: (...args: any[]) => mockOnDragDropEvent(...args),
    }),
}));

vi.mock("../../../lib/preferences", () => ({
    usePreferences: () => ({
        prefs: mockPrefs,
        updatePrefs: vi.fn(),
    }),
}));

vi.mock("../../../hooks/useCloudSync", () => ({
    useCloudSync: () => ({
        status: mockSyncStatus,
    }),
}));

vi.mock("../../../shared/api", () => ({
    api: {
        listPdfs: (...args: any[]) => mockListPdfs(...args),
        downloadPdf: (...args: any[]) => mockDownloadPdf(...args),
        uploadPdf: (...args: any[]) => mockUploadPdf(...args),
        importFile: (...args: any[]) => mockImportFile(...args),
        deletePdf: (...args: any[]) => mockDeletePdf(...args),
        updateMetadata: (...args: any[]) => mockUpdateMetadata(...args),
        refreshCsrf: (...args: any[]) => mockRefreshCsrf(...args),
    },
}));

// Mock child components
vi.mock("../../../components/PdfViewer", () => ({
    default: ({ onTotalPagesChange }: any) => {
        // Call onTotalPagesChange to simulate PDF loading
        React.useEffect(() => {
            onTotalPagesChange?.(5);
        }, []);
        return <div data-testid="pdf-viewer">PDF Viewer</div>;
    },
}));

// Store onSaved callbacks so tests can trigger them
const modalCallbacks: Record<string, any> = {};

vi.mock("../../../components/MetadataModal", () => ({
    default: ({ open, onSaved }: any) => {
        modalCallbacks.metadata = onSaved;
        return open ? <div data-testid="metadata-modal">Metadata</div> : null;
    },
}));

vi.mock("../../../components/RemovePagesModal", () => ({
    default: ({ open, onSaved }: any) => {
        modalCallbacks.remove = onSaved;
        return open ? <div data-testid="remove-modal">Remove</div> : null;
    },
}));

vi.mock("../../../components/ReorderPagesModal", () => ({
    default: ({ open, onSaved }: any) => {
        modalCallbacks.reorder = onSaved;
        return open ? <div data-testid="reorder-modal">Reorder</div> : null;
    },
}));

vi.mock("../../../components/SplitPagesModal", () => ({
    default: ({ open, onSaved }: any) => {
        modalCallbacks.split = onSaved;
        return open ? <div data-testid="split-modal">Split</div> : null;
    },
}));

vi.mock("../../../components/MergeModal", () => ({
    default: ({ open, onSaved }: any) => {
        modalCallbacks.merge = onSaved;
        return open ? <div data-testid="merge-modal">Merge</div> : null;
    },
}));

vi.mock("../../../components/LockUnlockModal", () => ({
    default: ({ open, onSaved }: any) => {
        modalCallbacks.lock = onSaved;
        return open ? <div data-testid="lock-modal">Lock</div> : null;
    },
}));

vi.mock("../../components/GuestConvertBanner", () => ({
    default: () => <div data-testid="guest-banner">Guest</div>,
}));

vi.mock("../../../components/OcrModal", () => ({
    default: ({ open }: any) => (open ? <div data-testid="ocr-modal">OCR</div> : null),
}));

vi.mock("../../../components/AnnotationDialog", () => ({
    default: ({ open }: any) => (open ? <div data-testid="annotation-modal">Annotation</div> : null),
}));

vi.mock("../../../components/ShareDialog", () => ({
    default: ({ open }: any) => (open ? <div data-testid="share-modal">Share</div> : null),
}));

vi.mock("../../../components/ImportExportModal", () => ({
    default: ({ open }: any) => (open ? <div data-testid="import-export-modal">ImportExport</div> : null),
}));

// ─── Tests ────────────────────────────────────────────────────────

describe("EditorPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockIsTauri = false;
        mockListPdfs.mockResolvedValue({ items: [] });
        mockDownloadPdf.mockResolvedValue(new Blob(["fake-pdf-content"], { type: "application/pdf" }));
        mockRefreshCsrf.mockResolvedValue(undefined);
        mockUser = { id: "u1", email: "test@test.com", full_name: "Test User", license_tier: "pro" };
        mockPrefs = { language: "it", default_zoom: 100, default_save_folder: "" };
        mockSyncStatus = {};
    });

    it("enters multi-select mode and shows checkboxes", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc1.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
                { id: "p2", original_filename: "doc2.pdf", file_size: 2048, page_count: 5, created_at: "2025-01-02T00:00:00Z", upload_source: "desktop" },
            ],
        });
        render(<EditorPage />);
        await waitFor(() => expect(screen.getByText("doc1.pdf")).toBeInTheDocument());

        fireEvent.click(screen.getByTestId("multi-select-toggle"));
        expect(screen.getByTestId("file-checkbox-p1")).toBeInTheDocument();
        expect(screen.getByTestId("file-checkbox-p2")).toBeInTheDocument();
    });
    it("selects files and shows batch actions", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc1.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
                { id: "p2", original_filename: "doc2.pdf", file_size: 2048, page_count: 5, created_at: "2025-01-02T00:00:00Z", upload_source: "desktop" },
            ],
        });
        render(<EditorPage />);
        await waitFor(() => expect(screen.getByText("doc1.pdf")).toBeInTheDocument());

        fireEvent.click(screen.getByTestId("multi-select-toggle"));
        fireEvent.click(screen.getByTestId("file-checkbox-p1"));
        fireEvent.click(screen.getByTestId("file-checkbox-p2"));

        expect(screen.getByTestId("batch-actions")).toBeInTheDocument();
        expect(screen.getByTestId("multi-select-count").textContent).toContain("2");
    });
    it("selects all files with select all button", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc1.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
                { id: "p2", original_filename: "doc2.pdf", file_size: 2048, page_count: 5, created_at: "2025-01-02T00:00:00Z", upload_source: "desktop" },
            ],
        });
        render(<EditorPage />);
        await waitFor(() => expect(screen.getByText("doc1.pdf")).toBeInTheDocument());

        fireEvent.click(screen.getByTestId("multi-select-toggle"));
        fireEvent.click(screen.getByTestId("multi-select-all"));

        expect(screen.getByTestId("multi-select-count").textContent).toContain("2");
    });
    it("deletes selected files in batch", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc1.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
                { id: "p2", original_filename: "doc2.pdf", file_size: 2048, page_count: 5, created_at: "2025-01-02T00:00:00Z", upload_source: "desktop" },
            ],
        });
        render(<EditorPage />);
        await waitFor(() => expect(screen.getByText("doc1.pdf")).toBeInTheDocument());

        fireEvent.click(screen.getByTestId("multi-select-toggle"));
        fireEvent.click(screen.getByTestId("file-checkbox-p1"));
        fireEvent.click(screen.getByTestId("batch-delete"));

        await waitFor(() => {
            expect(mockDeletePdf).toHaveBeenCalledWith("p1");
        });
        expect(screen.queryByTestId("batch-actions")).not.toBeInTheDocument();
    });
    it("exports selected files in batch", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc1.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
                { id: "p2", original_filename: "doc2.pdf", file_size: 2048, page_count: 5, created_at: "2025-01-02T00:00:00Z", upload_source: "desktop" },
            ],
        });
        mockDownloadPdf.mockResolvedValue(new Blob([new Uint8Array([1, 2, 3])], { type: "application/pdf" }));
        render(<EditorPage />);
        await waitFor(() => expect(screen.getByText("doc1.pdf")).toBeInTheDocument());

        fireEvent.click(screen.getByTestId("multi-select-toggle"));
        fireEvent.click(screen.getByTestId("file-checkbox-p2"));
        fireEvent.click(screen.getByTestId("batch-export"));

        await waitFor(() => {
            expect(mockDownloadPdf).toHaveBeenCalledWith("p2");
        });
        expect(mockTauriInvoke).toHaveBeenCalled();
    });
});
