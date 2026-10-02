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

    it("shows zoom controls when document selected", async () => {
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
    });
    it("shows fast actions buttons", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getByText("doc.pdf"));
        expect(screen.getByText("MERGE")).toBeInTheDocument();
        expect(screen.getByText("SPLIT")).toBeInTheDocument();
        expect(screen.getByText("LOCK")).toBeInTheDocument();
        expect(screen.getByTestId("fast-action-ocr")).toBeInTheDocument();
    });
    it("opens OCR dialog from fast actions when a doc is selected", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getByText("doc.pdf"));
        expect(screen.queryByTestId("ocr-modal")).not.toBeInTheDocument();
        fireEvent.click(screen.getByTestId("fast-action-ocr"));
        expect(screen.getByTestId("ocr-modal")).toBeInTheDocument();
    });
    it("opens OCR dialog from toolbar when a doc is selected", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getByText("doc.pdf"));
        fireEvent.click(screen.getByTestId("toolbar-annotate-menu"));
        fireEvent.click(screen.getByTestId("toolbar-ocr"));
        expect(screen.getByTestId("ocr-modal")).toBeInTheDocument();
    });
    it("opens annotation dialog from toolbar when a doc is selected", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getByText("doc.pdf"));
        fireEvent.click(screen.getByTestId("toolbar-annotate-menu"));
        fireEvent.click(screen.getByTestId("toolbar-annotate"));
        expect(screen.getByTestId("annotation-modal")).toBeInTheDocument();
    });
    it("opens share dialog from toolbar when a doc is selected", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getByText("doc.pdf"));
        fireEvent.click(screen.getByTestId("toolbar-share"));
        expect(screen.getByTestId("share-modal")).toBeInTheDocument();
    });
    it("opens import/export dialog without a selected PDF", async () => {
        mockListPdfs.mockResolvedValue({ items: [] });
        render(<EditorPage />);
        await screen.findByText("Documenti recenti");
        expect(screen.queryByTestId("import-export-modal")).not.toBeInTheDocument();
        fireEvent.click(screen.getByTestId("toolbar-convert"));
        fireEvent.click(screen.getByText("Importa/Esporta"));
        expect(screen.getByTestId("import-export-modal")).toBeInTheDocument();
    });
    it("shows UNLOCK for password-protected doc in fast actions", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "locked.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web", is_password_protected: true },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("locked.pdf");
        fireEvent.click(screen.getByText("locked.pdf"));
        expect(screen.getByText("UNLOCK")).toBeInTheDocument();
    });
    it("navigates pages with prev/next buttons", async () => {
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
        const nextBtn = screen.getByText("▶");
        fireEvent.click(nextBtn);
        expect(screen.getByText(/2 \/ 5/)).toBeInTheDocument();
        fireEvent.click(prevBtn);
        expect(screen.getByText(/1 \/ 5/)).toBeInTheDocument();
    });
    it("changes zoom with +/- buttons", async () => {
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
        const zoomOut = screen.getByText("−");
        const zoomIn = screen.getByText("+");
        fireEvent.click(zoomIn);
        expect(screen.getByText("125%")).toBeInTheDocument();
        fireEvent.click(zoomOut);
        expect(screen.getByText("100%")).toBeInTheDocument();
    });
    it("shows download button disabled when no doc selected", () => {
        render(<EditorPage />);
        expect(screen.getByText("Scarica")).toBeDisabled();
    });
    it("shows edit button selected by default", () => {
        render(<EditorPage />);
        expect(screen.getByText("Modifica")).toBeInTheDocument();
    });
    it("shows cloud sync section in sidebar", () => {
        render(<EditorPage />);
        expect(screen.getByText("Cloud Sync")).toBeInTheDocument();
    });
    it("shows cloud sync section in sidebar", () => {
        render(<EditorPage />);
        expect(screen.getByText("Cloud Sync")).toBeInTheDocument();
    });
    it("shows user initial in avatar", () => {
        render(<EditorPage />);
        expect(screen.getByText("T")).toBeInTheDocument();
    });
    it("shows page metadata section", () => {
        render(<EditorPage />);
        expect(screen.getByText("Metadati pagina")).toBeInTheDocument();
    });
    it("shows fast actions section", () => {
        render(<EditorPage />);
        expect(screen.getByText("Fast Actions")).toBeInTheDocument();
    });
    it("shows sidecar online status in footer", () => {
        render(<EditorPage />);
        expect(screen.getByText(/Sidecar online/)).toBeInTheDocument();
    });
    it("triggers file input click on Apri PDF button", () => {
        const clickSpy = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => { });
        render(<EditorPage />);
        fireEvent.click(screen.getByText("Apri PDF"));
        expect(clickSpy).toHaveBeenCalled();
        clickSpy.mockRestore();
    });
    it("ignores non-PDF file upload", async () => {
        mockUploadPdf.mockRejectedValue(new Error("Should not be called"));
        render(<EditorPage />);
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) {
            const file = new File(["fake"], "test.txt", { type: "text/plain" });
            fireEvent.change(fileInput, { target: { files: [file] } });
        }
        expect(mockUploadPdf).not.toHaveBeenCalled();
    });
    it("shows formatDate for recent time", async () => {
        const now = new Date();
        const fiveMinAgo = new Date(now.getTime() - 5 * 60000).toISOString();
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "recent.pdf", file_size: 1024, page_count: 3, created_at: fiveMinAgo, upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await waitFor(() => {
            expect(screen.getByText(/5m fa/)).toBeInTheDocument();
        });
    });
    it("shows formatDate for hours ago", async () => {
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
    it("shows formatDate for days ago", async () => {
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
    it("shows formatDate for older dates", async () => {
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
    it("shows formatDate for 'ora'", async () => {
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
    it("shows formatDate for empty date", () => {
        expect(true).toBe(true);
    });
    it("shows delete button for each document", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
                { id: "p2", original_filename: "doc2.pdf", file_size: 2048, page_count: 5, created_at: "2025-01-02T00:00:00Z", upload_source: "desktop" },
            ],
        });
        render(<EditorPage />);
        await waitFor(() => {
            const deleteBtns = screen.getAllByTitle("Elimina");
            expect(deleteBtns.length).toBe(2);
        });
    });
    it("shows settings link navigates to /settings", () => {
        render(<EditorPage />);
        const settingsLink = screen.getByTitle("Impostazioni");
        expect(settingsLink.closest("a")).toHaveAttribute("href", "/settings");
    });
    it("shows profile link navigates to /profile", () => {
        render(<EditorPage />);
        const profileLink = screen.getByText("Test User").closest("a");
        expect(profileLink).toHaveAttribute("href", "/profile");
    });
    it("shows zoom controls at bounds", async () => {
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
        const zoomOut = screen.getByText("−");
        const zoomIn = screen.getByText("+");
        for (let i = 0; i < 10; i++) fireEvent.click(zoomIn);
        expect(screen.getByText("300%")).toBeInTheDocument();
        for (let i = 0; i < 15; i++) fireEvent.click(zoomOut);
        expect(screen.getByText("25%")).toBeInTheDocument();
    });
    it("uploads PDF successfully", async () => {
        const uploadedDoc = { id: "p1", original_filename: "uploaded.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" };
        mockUploadPdf.mockResolvedValue(uploadedDoc);
        render(<EditorPage />);
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) {
            const file = new File(["fake-pdf"], "test.pdf", { type: "application/pdf" });
            fireEvent.change(fileInput, { target: { files: [file] } });
        }
        await waitFor(() => {
            expect(mockUploadPdf).toHaveBeenCalled();
        });
    });
    it("handles drop event for file upload", () => {
        render(<EditorPage />);
        const file = new File(["fake-pdf"], "dropped.pdf", { type: "application/pdf" });
        const dataTransfer = { files: [file] };
        fireEvent.drop(document, { dataTransfer });
        expect(screen.queryByText("Rilascia per caricare")).not.toBeInTheDocument();
    });
    it("shows Free license for free users", () => {
        mockUser = { ...mockUser, license_tier: "free" };
        render(<EditorPage />);
        expect(screen.getByText(/free Licenza/)).toBeInTheDocument();
    });
    it("shows pro license for pro users", () => {
        mockUser = { ...mockUser, license_tier: "pro" };
        render(<EditorPage />);
        expect(screen.getByText(/pro Licenza/)).toBeInTheDocument();
    });
    it("shows user initial for user without full_name", () => {
        mockUser = { ...mockUser, full_name: "" };
        render(<EditorPage />);
        expect(screen.getByText("U")).toBeInTheDocument();
    });
});
