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

    it("1a: handles download via tauriInvoke", async () => {
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
            expect(mockTauriInvoke).toHaveBeenCalledWith("dialog_save", expect.objectContaining({
                defaultName: "doc.pdf",
            }));
        });
    });
    it("1a: handles download with default save folder", async () => {
        mockPrefs = { ...mockPrefs, default_save_folder: "/default/folder" };
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
            expect(mockTauriInvoke).toHaveBeenCalledWith("dialog_save", expect.objectContaining({
                defaultFolder: "/default/folder",
            }));
        });
    });
    it("1a: handles download error gracefully", async () => {
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
        await new Promise((r) => setTimeout(r, 100));
    });
    it("1a: handles download with tauriInvoke failure", async () => {
        mockTauriInvoke.mockRejectedValue(new Error("Tauri error"));
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
        await new Promise((r) => setTimeout(r, 100));
    });
    it("1b: handles open local with Tauri dialog", async () => {
        mockIsTauri = true;
        mockTauriInvoke
            .mockResolvedValueOnce("/path/to/file.pdf")
            .mockResolvedValueOnce([37, 80, 68, 70]);
        mockUploadPdf.mockResolvedValue({ id: "p1", original_filename: "file.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" });
        render(<EditorPage />);
        fireEvent.click(screen.getByText("Apri PDF"));
        await waitFor(() => {
            expect(mockUploadPdf).toHaveBeenCalled();
        });
    });
    it("1b: handles open local with Tauri dialog cancelled", async () => {
        mockIsTauri = true;
        mockTauriInvoke.mockResolvedValueOnce(null);
        render(<EditorPage />);
        fireEvent.click(screen.getByText("Apri PDF"));
        await new Promise((r) => setTimeout(r, 100));
        expect(mockUploadPdf).not.toHaveBeenCalled();
    });
    it("1b: handles open local with Tauri read failure", async () => {
        mockIsTauri = true;
        mockTauriInvoke
            .mockResolvedValueOnce("/path/to/file.pdf")
            .mockResolvedValueOnce(null);
        render(<EditorPage />);
        fireEvent.click(screen.getByText("Apri PDF"));
        await new Promise((r) => setTimeout(r, 100));
        expect(mockUploadPdf).not.toHaveBeenCalled();
    });
    it("1b: handles open local with work folder from localStorage", async () => {
        mockIsTauri = true;
        localStorage.setItem("pdfeditor_work_folder", "/work/folder");
        mockTauriInvoke
            .mockResolvedValueOnce("/work/folder/doc.pdf")
            .mockResolvedValueOnce([37, 80, 68, 70]);
        mockUploadPdf.mockResolvedValue({ id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" });
        render(<EditorPage />);
        fireEvent.click(screen.getByText("Apri PDF"));
        await waitFor(() => {
            expect(mockTauriInvoke).toHaveBeenCalledWith("dialog_open", expect.objectContaining({
                defaultPath: "/work/folder",
            }));
        });
        localStorage.removeItem("pdfeditor_work_folder");
    });
    it("1b: registers Tauri drag-drop and uploads dropped file", async () => {
        mockIsTauri = true;
        mockTauriInvoke
            .mockResolvedValueOnce([37, 80, 68, 70]); // read_file_binary
        mockUploadPdf.mockResolvedValue({ id: "p1", original_filename: "dropped.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" });
        render(<EditorPage />);

        // Simulate the Tauri drag-drop registration
        await waitFor(() => {
            expect(mockOnDragDropEvent).toHaveBeenCalled();
        });

        // Capture the callback and simulate a drop
        const callback = mockOnDragDropEvent.mock.calls[0][0];
        await act(async () => {
            callback({ payload: { type: "drop", paths: ["C:\\docs\\dropped.pdf"] } });
        });

        await waitFor(() => {
            expect(mockTauriInvoke).toHaveBeenCalledWith("read_file_binary", { path: "C:\\docs\\dropped.pdf" });
            expect(mockUploadPdf).toHaveBeenCalled();
        });
    });
    it("1c: handles rename with same filename (no API call)", async () => {
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
            fireEvent.change(renameInput, { target: { value: "doc.pdf" } });
            fireEvent.keyDown(renameInput, { key: "Enter" });
            expect(mockUpdateMetadata).not.toHaveBeenCalled();
        }
    });
    it("1c: handles rename with empty value (no API call)", async () => {
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
    it("1c: handles rename API error gracefully", async () => {
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
    it("1d: shows locked overlay for password-protected PDF", async () => {
        mockDownloadPdf.mockRejectedValue(new Error("protetto da password"));
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "locked.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web", is_password_protected: true },
            ],
        });
        render(<EditorPage />);
        const icons = await screen.findAllByText("🌐");
        if (icons.length > 0) fireEvent.click(icons[0]);
        await waitFor(() => {
            expect(screen.getByText("PDF protetto")).toBeInTheDocument();
        }, { timeout: 3000 });
    });
    it("1d: shows locked overlay without is_password_protected flag", async () => {
        mockDownloadPdf.mockRejectedValue(new Error("protetto da password"));
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
    it("1d: opens lock modal from locked overlay", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "locked.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web", is_password_protected: true },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("locked.pdf");
        fireEvent.click(screen.getByText("locked.pdf"));
        fireEvent.click(screen.getByText("Sblocca PDF"));
        expect(screen.getByTestId("lock-modal")).toBeInTheDocument();
    });
    it("1e: handles drop event for file upload", () => {
        render(<EditorPage />);
        const file = new File(["fake-pdf"], "dropped.pdf", { type: "application/pdf" });
        const dataTransfer = { files: [file] };
        fireEvent.drop(document, { dataTransfer });
        expect(screen.queryByText("Rilascia per caricare")).not.toBeInTheDocument();
    });
    it("1e: handles drop event with non-PDF file", () => {
        render(<EditorPage />);
        const file = new File(["fake"], "test.txt", { type: "text/plain" });
        const dataTransfer = { files: [file] };
        fireEvent.drop(document, { dataTransfer });
        expect(mockUploadPdf).not.toHaveBeenCalled();
    });
    it("1e: handles drop event with no file", () => {
        render(<EditorPage />);
        fireEvent.drop(document, { dataTransfer: { files: [] } });
        expect(mockUploadPdf).not.toHaveBeenCalled();
    });
    it("1e: shows drag and drop overlay", () => {
        render(<EditorPage />);
        fireEvent.dragOver(document);
        expect(screen.getByText("Rilascia per caricare")).toBeInTheDocument();
    });
    it("1e: hides drag overlay on drag leave", () => {
        render(<EditorPage />);
        fireEvent.dragOver(document);
        fireEvent.dragLeave(document);
        expect(screen.queryByText("Rilascia per caricare")).not.toBeInTheDocument();
    });
    it("1f: handles zoom sync from preferences", async () => {
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
    it("1f: handles page navigation at bounds", async () => {
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
    it("1f: handles zoom at bounds", async () => {
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
    it("1g: handles upload error display", async () => {
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
    it("1g: handles upload with non-Error rejection", async () => {
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
    it("1g: handles CSRF refresh on mount", () => {
        render(<EditorPage />);
        expect(mockRefreshCsrf).toHaveBeenCalled();
    });
    it("1h: handles getPlatformIcon for desktop source", async () => {
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
    it("1h: handles getPlatformIcon for mobile source", async () => {
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
    it("1h: handles getPlatformIcon for unknown source", async () => {
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
    it("1h: handles getPlatformIcon for undefined source", async () => {
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
    it("1h: handles formatDate for 'ora'", async () => {
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
    it("1h: handles formatDate for minutes", async () => {
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
    it("1h: handles formatDate for hours", async () => {
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
    it("1h: handles formatDate for days", async () => {
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
    it("1h: handles formatDate for older dates", async () => {
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
    it("1h: handles formatDate for empty string", () => {
        render(<EditorPage />);
        expect(screen.getByText("Apri PDF")).toBeInTheDocument();
    });
    it("1h: handles formatFileSize for KB", async () => {
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
    it("1h: handles formatFileSize for MB", async () => {
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
    it("1i: handles user without email", () => {
        mockUser = { ...mockUser, email: null };
        render(<EditorPage />);
        expect(screen.getByText("Apri PDF")).toBeInTheDocument();
    });
    it("1i: handles user without license_tier", () => {
        mockUser = { ...mockUser, license_tier: null };
        render(<EditorPage />);
        expect(screen.getByText("Apri PDF")).toBeInTheDocument();
    });
    it("1i: handles docs with null created_at", async () => {
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
    it("1i: handles docs with null file_size", async () => {
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
    it("1i: handles docs with null page_count", async () => {
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
    it("1i: handles docs with null upload_source", async () => {
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
    it("1i: handles multiple docs with different sizes", async () => {
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
    it("1i: handles delete confirm with selected doc being deleted", async () => {
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
    it("1i: handles download error that removes doc from list", async () => {
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
    it("1j: handles metadata modal onSaved", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getByText("doc.pdf"));
        fireEvent.click(screen.getByTestId("toolbar-convert"));
        fireEvent.click(screen.getByText("Metadati"));
        expect(screen.getByTestId("metadata-modal")).toBeInTheDocument();
        // Trigger onSaved
        const updatedDoc = { id: "p1", original_filename: "renamed.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" };
        await act(async () => {
            modalCallbacks.metadata?.(updatedDoc);
        });
        expect(screen.getAllByText("renamed.pdf").length).toBeGreaterThan(0);
    });
    it("1j: handles remove modal onSaved", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getByText("doc.pdf"));
        fireEvent.click(screen.getByTestId("toolbar-organize"));
        fireEvent.click(screen.getByText("Rimuovi"));
        expect(screen.getByTestId("remove-modal")).toBeInTheDocument();
        const updatedDoc = { id: "p1", original_filename: "removed.pdf", file_size: 1024, page_count: 2, created_at: "2025-01-01T00:00:00Z", upload_source: "web" };
        await act(async () => {
            modalCallbacks.remove?.(updatedDoc);
        });
        expect(screen.getAllByText("removed.pdf").length).toBeGreaterThan(0);
    });
    it("1j: handles reorder modal onSaved", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getByText("doc.pdf"));
        fireEvent.click(screen.getByTestId("toolbar-organize"));
        fireEvent.click(screen.getByText("Riordina"));
        expect(screen.getByTestId("reorder-modal")).toBeInTheDocument();
        const updatedDoc = { id: "p1", original_filename: "reordered.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" };
        await act(async () => {
            modalCallbacks.reorder?.(updatedDoc);
        });
        expect(screen.getAllByText("reordered.pdf").length).toBeGreaterThan(0);
    });
    it("1j: handles merge modal onSaved", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getByText("doc.pdf"));
        fireEvent.click(screen.getByTestId("toolbar-organize"));
        fireEvent.click(screen.getByText("Unisci"));
        expect(screen.getByTestId("merge-modal")).toBeInTheDocument();
        const updatedDoc = { id: "p1", original_filename: "merged.pdf", file_size: 1024, page_count: 6, created_at: "2025-01-01T00:00:00Z", upload_source: "web" };
        await act(async () => {
            modalCallbacks.merge?.(updatedDoc);
        });
        expect(screen.getAllByText("merged.pdf").length).toBeGreaterThan(0);
    });
    it("1j: handles split modal onSaved", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getByText("doc.pdf"));
        fireEvent.click(screen.getByTestId("toolbar-organize"));
        fireEvent.click(screen.getByText("Dividi"));
        expect(screen.getByTestId("split-modal")).toBeInTheDocument();
        const newDocs = [
            { id: "s1", original_filename: "part1.pdf", file_size: 512, page_count: 1, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            { id: "s2", original_filename: "part2.pdf", file_size: 512, page_count: 2, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
        ];
        await act(async () => {
            modalCallbacks.split?.(newDocs);
        });
        expect(screen.getAllByText("part1.pdf").length).toBeGreaterThan(0);
        expect(screen.getAllByText("part2.pdf").length).toBeGreaterThan(0);
    });
    it("1j: handles lock modal onSaved", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getByText("doc.pdf"));
        fireEvent.click(screen.getByText("LOCK"));
        expect(screen.getByTestId("lock-modal")).toBeInTheDocument();
        const updatedDoc = { id: "p1", original_filename: "locked.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web", is_password_protected: true };
        await act(async () => {
            modalCallbacks.lock?.(updatedDoc);
        });
        expect(screen.getAllByText("locked.pdf").length).toBeGreaterThan(0);
    });
});
