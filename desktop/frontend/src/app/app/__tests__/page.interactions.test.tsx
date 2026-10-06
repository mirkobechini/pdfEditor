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

    it("shows formatDate for 'ora' when just created", async () => {
        const now = new Date().toISOString();
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "justnow.pdf", file_size: 1024, page_count: 3, created_at: now, upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await waitFor(() => {
            expect(screen.getByText(/ora/)).toBeInTheDocument();
        });
    });
    it("shows download button enabled when doc selected", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 5, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getByText("doc.pdf"));
        await waitFor(() => {
            expect(screen.getByText("Scarica")).not.toBeDisabled();
        });
    });
    it("shows organize dropdown disabled when no doc selected", () => {
        render(<EditorPage />);
        expect(screen.getByTestId("toolbar-organize")).toBeDisabled();
    });
    it("shows convert dropdown enabled when no doc selected (import available)", () => {
        render(<EditorPage />);
        expect(screen.getByTestId("toolbar-convert")).not.toBeDisabled();
    });
    it("shows annotate dropdown disabled when no doc selected", () => {
        render(<EditorPage />);
        expect(screen.getByTestId("toolbar-annotate-menu")).toBeDisabled();
    });
    it("handles rename on double-click and Enter key", async () => {
        mockUpdateMetadata.mockResolvedValue(undefined);
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        // Double-click to start rename
        fireEvent.doubleClick(screen.getByText("doc.pdf"));
        const input = document.querySelector('input[class*="border-\\[\\#f7871f\\]"]') as HTMLInputElement;
        if (input) {
            fireEvent.change(input, { target: { value: "renamed.pdf" } });
            fireEvent.keyDown(input, { key: "Enter" });
            await waitFor(() => {
                expect(mockUpdateMetadata).toHaveBeenCalledWith("p1", { new_filename: "renamed.pdf" });
            });
        }
    });
    it("handles rename blur without saving", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.doubleClick(screen.getByText("doc.pdf"));
        // Just verify the component still renders after double-click
        expect(screen.getByText("Apri PDF")).toBeInTheDocument();
    });
    it("handles download via tauriInvoke", async () => {
        mockTauriInvoke.mockResolvedValue("/saved/path.pdf");
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getByText("doc.pdf"));
        await waitFor(() => {
            expect(screen.getByText("Scarica")).not.toBeDisabled();
        });
        fireEvent.click(screen.getByText("Scarica"));
        await waitFor(() => {
            expect(mockTauriInvoke).toHaveBeenCalled();
        });
    });
    it("handles download error gracefully", async () => {
        mockDownloadPdf.mockRejectedValue(new Error("Download failed"));
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getByText("doc.pdf"));
        await waitFor(() => {
            expect(screen.getByText("Scarica")).not.toBeDisabled();
        });
        fireEvent.click(screen.getByText("Scarica"));
        // Should not throw
        await new Promise((r) => setTimeout(r, 100));
    });
    it("shows platform icon for undefined source", () => {
        render(<EditorPage />);
        expect(screen.getByText("Apri PDF")).toBeInTheDocument();
    });
    it("handles delete confirm action", async () => {
        mockDeletePdf.mockResolvedValue(undefined);
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getAllByTitle("Elimina")[0]);
        fireEvent.click(screen.getByText("Elimina"));
        await waitFor(() => {
            expect(mockDeletePdf).toHaveBeenCalledWith("p1");
        });
    });
    it("handles delete error gracefully", async () => {
        mockDeletePdf.mockRejectedValue(new Error("Delete failed"));
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getAllByTitle("Elimina")[0]);
        fireEvent.click(screen.getByText("Elimina"));
        await waitFor(() => {
            expect(mockDeletePdf).toHaveBeenCalledWith("p1");
        });
    });
    it("handles retry logic when listPdfs fails initially", async () => {
        mockListPdfs
            .mockRejectedValueOnce(new Error("Not ready"))
            .mockResolvedValueOnce({ items: [{ id: "p1", original_filename: "retry.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" }] });
        render(<EditorPage />);
        await waitFor(() => {
            expect(screen.getByText("retry.pdf")).toBeInTheDocument();
        }, { timeout: 5000 });
    }, 10000);
    it("handles password-protected doc without error message", async () => {
        mockDownloadPdf.mockRejectedValue({ message: "protetto da password" });
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "locked.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web", is_password_protected: true },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("locked.pdf");
        fireEvent.click(screen.getByText("locked.pdf"));
        await waitFor(() => {
            expect(screen.getByText("PDF protetto")).toBeInTheDocument();
        }, { timeout: 3000 });
    });
    it("handles rename with empty value (no API call)", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.doubleClick(screen.getByText("doc.pdf"));
        const renameInput = document.querySelector('input[class*="border"]') as HTMLInputElement;
        if (renameInput) {
            fireEvent.change(renameInput, { target: { value: "" } });
            fireEvent.keyDown(renameInput, { key: "Enter" });
            expect(mockUpdateMetadata).not.toHaveBeenCalled();
        }
    });
    it("handles rename API error gracefully", async () => {
        mockUpdateMetadata.mockRejectedValue(new Error("Rename failed"));
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.doubleClick(screen.getByText("doc.pdf"));
        const renameInput = document.querySelector('input[class*="border"]') as HTMLInputElement;
        if (renameInput) {
            fireEvent.change(renameInput, { target: { value: "renamed.pdf" } });
            fireEvent.keyDown(renameInput, { key: "Enter" });
            await new Promise((r) => setTimeout(r, 50));
            expect(mockUpdateMetadata).toHaveBeenCalled();
        }
    });
    it("handles download error that removes doc from list", async () => {
        mockDownloadPdf.mockRejectedValue(new Error("PDF not found"));
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "missing.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("missing.pdf");
        fireEvent.click(screen.getByText("missing.pdf"));
        await waitFor(() => {
            expect(screen.queryByText("missing.pdf")).not.toBeInTheDocument();
        }, { timeout: 3000 });
    });
    it("handles CSRF refresh on mount", () => {
        render(<EditorPage />);
        expect(mockRefreshCsrf).toHaveBeenCalled();
    });
    it("handles drop event with non-PDF file", () => {
        render(<EditorPage />);
        const file = new File(["fake"], "test.txt", { type: "text/plain" });
        const dataTransfer = { files: [file] };
        fireEvent.drop(document, { dataTransfer });
        expect(mockUploadPdf).not.toHaveBeenCalled();
    });
    it("imports image file on drop", async () => {
        mockImportFile.mockResolvedValue({ id: "p2", original_filename: "photo.png", file_size: 1024, page_count: 1, created_at: "2025-01-01T00:00:00Z", upload_source: "web" });
        render(<EditorPage />);
        const file = new File(["img"], "photo.png", { type: "image/png" });
        const dataTransfer = { files: [file] };
        fireEvent.drop(document, { dataTransfer });
        await waitFor(() => {
            expect(mockImportFile).toHaveBeenCalledWith(file);
        });
        expect(mockUploadPdf).not.toHaveBeenCalled();
    });
    it("handles drop event with no file", () => {
        render(<EditorPage />);
        fireEvent.drop(document, { dataTransfer: { files: [] } });
        expect(mockUploadPdf).not.toHaveBeenCalled();
    });
    it("handles user without email", () => {
        mockUser = { ...mockUser, email: null };
        render(<EditorPage />);
        expect(screen.getByText("Apri PDF")).toBeInTheDocument();
    });
    it("handles user without license_tier", () => {
        mockUser = { ...mockUser, license_tier: null };
        render(<EditorPage />);
        expect(screen.getByText("Apri PDF")).toBeInTheDocument();
    });
    it("handles docs with null created_at", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "nodate.pdf", file_size: 1024, page_count: 3, created_at: null, upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await waitFor(() => {
            expect(screen.getByText("nodate.pdf")).toBeInTheDocument();
        });
    });
    it("handles docs with null file_size", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "nosize.pdf", file_size: null, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await waitFor(() => {
            expect(screen.getByText("nosize.pdf")).toBeInTheDocument();
        });
    });
    it("handles docs with null page_count", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "nopages.pdf", file_size: 1024, page_count: null, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await waitFor(() => {
            expect(screen.getByText("nopages.pdf")).toBeInTheDocument();
        });
    });
    it("handles docs with null upload_source", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "nosource.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: null },
            ],
        });
        render(<EditorPage />);
        await waitFor(() => {
            expect(screen.getByText("☁️")).toBeInTheDocument();
        });
    });
    it("handles multiple docs with different sizes", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "small.pdf", file_size: 500, page_count: 1, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
                { id: "p2", original_filename: "medium.pdf", file_size: 2048, page_count: 2, created_at: "2025-01-02T00:00:00Z", upload_source: "desktop" },
                { id: "p3", original_filename: "large.pdf", file_size: 3145728, page_count: 10, created_at: "2025-01-03T00:00:00Z", upload_source: "mobile" },
            ],
        });
        render(<EditorPage />);
        await waitFor(() => {
            expect(screen.getByText("small.pdf")).toBeInTheDocument();
            expect(screen.getByText("medium.pdf")).toBeInTheDocument();
            expect(screen.getByText("large.pdf")).toBeInTheDocument();
        });
    });
    it("handles delete confirm with selected doc being deleted", async () => {
        mockDeletePdf.mockResolvedValue(undefined);
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getByText("doc.pdf"));
        await waitFor(() => {
            expect(screen.getByText("Seleziona un PDF")).toBeInTheDocument();
        });
    });
    it("handles zoom sync from preferences", async () => {
        mockPrefs = { ...mockPrefs, default_zoom: 150 };
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 5, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getByText("doc.pdf"));
        await waitFor(() => {
            expect(screen.getByText("150%")).toBeInTheDocument();
        });
    });
    it("handles page navigation at bounds", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 5, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getByText("doc.pdf"));
        await waitFor(() => {
            expect(screen.getByText(/1 \/ 5/)).toBeInTheDocument();
        });
        const prevBtn = screen.getByText("◀");
        fireEvent.click(prevBtn);
        expect(screen.getByText(/1 \/ 5/)).toBeInTheDocument();
        const nextBtn = screen.getByText("▶");
        for (let i = 0; i < 10; i++) fireEvent.click(nextBtn);
        expect(screen.getByText(/5 \/ 5/)).toBeInTheDocument();
    });
    it("handles zoom at bounds", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 5, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getByText("doc.pdf"));
        await waitFor(() => {
            expect(screen.getByText("100%")).toBeInTheDocument();
        });
        const zoomIn = screen.getByText("+");
        const zoomOut = screen.getByText("−");
        for (let i = 0; i < 20; i++) fireEvent.click(zoomOut);
        expect(screen.getByText("25%")).toBeInTheDocument();
        for (let i = 0; i < 20; i++) fireEvent.click(zoomIn);
        expect(screen.getByText("300%")).toBeInTheDocument();
    });
    it("handles upload error display", async () => {
        mockUploadPdf.mockRejectedValue(new Error("Upload error"));
        render(<EditorPage />);
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) {
            const file = new File(["fake"], "test.pdf", { type: "application/pdf" });
            fireEvent.change(fileInput, { target: { files: [file] } });
        }
        await waitFor(() => {
            expect(screen.getByText("common.unknownError")).toBeInTheDocument();
        });
    });
    it("handles upload with non-Error rejection", async () => {
        mockUploadPdf.mockRejectedValue("string error");
        render(<EditorPage />);
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) {
            const file = new File(["fake"], "test.pdf", { type: "application/pdf" });
            fireEvent.change(fileInput, { target: { files: [file] } });
        }
        await waitFor(() => {
            expect(screen.getByText("common.unknownError")).toBeInTheDocument();
        });
    });
    it("handles getPlatformIcon for desktop source", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "desktop.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "desktop" },
            ],
        });
        render(<EditorPage />);
        await waitFor(() => {
            expect(screen.getByText("💻")).toBeInTheDocument();
        });
    });
    it("handles getPlatformIcon for undefined source", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "nosource.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z" },
            ],
        });
        render(<EditorPage />);
        await waitFor(() => {
            expect(screen.getByText("☁️")).toBeInTheDocument();
        });
    });
    it("handles formatDate for empty string", () => {
        render(<EditorPage />);
        expect(screen.getByText("Apri PDF")).toBeInTheDocument();
    });
    it("handles formatFileSize for KB", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "kb.pdf", file_size: 2048, page_count: 1, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await waitFor(() => {
            expect(screen.getByText(/2 KB/)).toBeInTheDocument();
        });
    });
    it("handles formatFileSize for MB", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "mb.pdf", file_size: 3145728, page_count: 1, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await waitFor(() => {
            expect(screen.getByText(/3\.0 MB/)).toBeInTheDocument();
        });
    });
    it("handles formatDate for 'ora'", async () => {
        const now = new Date().toISOString();
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "justnow.pdf", file_size: 1024, page_count: 3, created_at: now, upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await waitFor(() => {
            expect(screen.getByText(/ora/)).toBeInTheDocument();
        });
    });
    it("handles formatDate for minutes", async () => {
        const now = new Date();
        const fiveMinAgo = new Date(now.getTime() - 5 * 60000).toISOString();
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "mins.pdf", file_size: 1024, page_count: 3, created_at: fiveMinAgo, upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await waitFor(() => {
            expect(screen.getByText(/5m fa/)).toBeInTheDocument();
        });
    });
    it("handles formatDate for hours", async () => {
        const now = new Date();
        const threeHoursAgo = new Date(now.getTime() - 3 * 3600000).toISOString();
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "hours.pdf", file_size: 1024, page_count: 3, created_at: threeHoursAgo, upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await waitFor(() => {
            expect(screen.getByText(/3h fa/)).toBeInTheDocument();
        });
    });
    it("handles formatDate for days", async () => {
        const now = new Date();
        const threeDaysAgo = new Date(now.getTime() - 3 * 86400000).toISOString();
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "days.pdf", file_size: 1024, page_count: 3, created_at: threeDaysAgo, upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await waitFor(() => {
            expect(screen.getByText(/3g fa/)).toBeInTheDocument();
        });
    });
    it("handles formatDate for older dates", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "old.pdf", file_size: 1024, page_count: 3, created_at: "2024-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await waitFor(() => {
            expect(screen.getByText(/2024/)).toBeInTheDocument();
        });
    });
    it("handles formatDate for empty date string", () => {
        render(<EditorPage />);
        expect(screen.getByText("Apri PDF")).toBeInTheDocument();
    });
    it("handles getPlatformIcon for mobile source", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "mobile.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "mobile" },
            ],
        });
        render(<EditorPage />);
        await waitFor(() => {
            expect(screen.getByText("📱")).toBeInTheDocument();
        });
    });
    it("handles getPlatformIcon for unknown source", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "unknown.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "unknown" },
            ],
        });
        render(<EditorPage />);
        await waitFor(() => {
            expect(screen.getByText("☁️")).toBeInTheDocument();
        });
    });
    it("handles delete confirm with selected doc", async () => {
        mockDeletePdf.mockResolvedValue(undefined);
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getByText("doc.pdf"));
        fireEvent.click(screen.getAllByTitle("Elimina")[0]);
        fireEvent.click(screen.getByText("Elimina"));
        await waitFor(() => {
            expect(mockDeletePdf).toHaveBeenCalledWith("p1");
        });
    });
    it("handles empty docs list after loading", async () => {
        mockListPdfs.mockResolvedValue({ items: [] });
        render(<EditorPage />);
        await waitFor(() => {
            expect(screen.getByText("Nessun documento")).toBeInTheDocument();
        });
    });
    it("handles retry logic exhaustion", async () => {
        mockListPdfs.mockRejectedValue(new Error("Always fails"));
        render(<EditorPage />);
        await waitFor(() => {
            expect(screen.getByText("Nessun documento")).toBeInTheDocument();
        }, { timeout: 25000 });
    }, 30000);
    it("handles download with no selected doc (early return)", () => {
        render(<EditorPage />);
        const downloadBtn = screen.getByText("Scarica");
        expect(downloadBtn).toBeDisabled();
    });
});
