import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import EditorPage from "../page";

// ─── Mocks ────────────────────────────────────────────────────────

const mockListPdfs = vi.fn();
const mockDownloadPdf = vi.fn();
const mockUploadPdf = vi.fn();
const mockDeletePdf = vi.fn();
const mockUpdateMetadata = vi.fn();
const mockRefreshCsrf = vi.fn();
const mockTauriInvoke = vi.fn();

let mockUser: any = { id: "u1", email: "test@test.com", full_name: "Test User", license_tier: "pro" };
let mockPrefs: any = { language: "it", default_zoom: 100, default_save_folder: "" };
let mockSyncStatus: Record<string, string> = {};

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
        };
        return map[key] || key;
    },
}));

vi.mock("../../../shared/auth", () => ({
    useAuth: () => ({ user: mockUser }),
}));

vi.mock("../../../shared/tauri", () => ({
    isTauri: () => false,
    getApiBaseUrl: () => "http://127.0.0.1:7723",
    tauriInvoke: (...args: any[]) => mockTauriInvoke(...args),
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

vi.mock("../../../components/MetadataModal", () => ({
    default: ({ open }: any) => open ? <div data-testid="metadata-modal">Metadata</div> : null,
}));

vi.mock("../../../components/RemovePagesModal", () => ({
    default: ({ open }: any) => open ? <div data-testid="remove-modal">Remove</div> : null,
}));

vi.mock("../../../components/ReorderPagesModal", () => ({
    default: ({ open }: any) => open ? <div data-testid="reorder-modal">Reorder</div> : null,
}));

vi.mock("../../../components/SplitPagesModal", () => ({
    default: ({ open }: any) => open ? <div data-testid="split-modal">Split</div> : null,
}));

vi.mock("../../../components/MergeModal", () => ({
    default: ({ open }: any) => open ? <div data-testid="merge-modal">Merge</div> : null,
}));

vi.mock("../../../components/LockUnlockModal", () => ({
    default: ({ open }: any) => open ? <div data-testid="lock-modal">Lock</div> : null,
}));

vi.mock("../../components/GuestConvertBanner", () => ({
    default: () => <div data-testid="guest-banner">Guest</div>,
}));

// ─── Tests ────────────────────────────────────────────────────────

describe("EditorPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockListPdfs.mockResolvedValue({ items: [] });
        mockDownloadPdf.mockResolvedValue(new Blob(["fake-pdf-content"], { type: "application/pdf" }));
        mockRefreshCsrf.mockResolvedValue(undefined);
        mockUser = { id: "u1", email: "test@test.com", full_name: "Test User", license_tier: "pro" };
        mockPrefs = { language: "it", default_zoom: 100, default_save_folder: "" };
        mockSyncStatus = {};
    });

    it("renders the editor layout", async () => {
        render(<EditorPage />);
        expect(screen.getByText("Apri PDF")).toBeInTheDocument();
        expect(screen.getByText("Documenti recenti")).toBeInTheDocument();
    });

    it("shows loading skeleton while fetching docs", () => {
        mockListPdfs.mockImplementation(() => new Promise(() => { })); // never resolves
        render(<EditorPage />);
        expect(screen.getByText("Documenti recenti")).toBeInTheDocument();
    });

    it("shows empty state when no documents", async () => {
        render(<EditorPage />);
        await waitFor(() => {
            expect(screen.getByText("Nessun documento")).toBeInTheDocument();
        });
    });

    it("renders document list", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc1.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
                { id: "p2", original_filename: "doc2.pdf", file_size: 2048, page_count: 5, created_at: "2025-01-02T00:00:00Z", upload_source: "desktop" },
            ],
        });
        render(<EditorPage />);
        await waitFor(() => {
            expect(screen.getByText("doc1.pdf")).toBeInTheDocument();
            expect(screen.getByText("doc2.pdf")).toBeInTheDocument();
        });
    });

    it("shows sync status icons", async () => {
        mockSyncStatus = { p1: "synced", p2: "pending" };
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc1.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
                { id: "p2", original_filename: "doc2.pdf", file_size: 2048, page_count: 5, created_at: "2025-01-02T00:00:00Z", upload_source: "desktop" },
            ],
        });
        render(<EditorPage />);
        await waitFor(() => {
            expect(screen.getByText("☁️")).toBeInTheDocument();
            expect(screen.getByText("⏳")).toBeInTheDocument();
        });
    });

    it("renders user info in sidebar", () => {
        render(<EditorPage />);
        expect(screen.getByText("Test User")).toBeInTheDocument();
        expect(screen.getByText(/pro Licenza/)).toBeInTheDocument();
    });

    it("renders footer with status info", () => {
        render(<EditorPage />);
        expect(screen.getByText(/Sidecar online/)).toBeInTheDocument();
        expect(screen.getByText(/127\.0\.0\.1:7723/)).toBeInTheDocument();
        expect(screen.getByText("UTF-8")).toBeInTheDocument();
        expect(screen.getByText("SQLite")).toBeInTheDocument();
        expect(screen.getByText("PyMuPDF")).toBeInTheDocument();
    });

    it("renders guest banner", () => {
        render(<EditorPage />);
        expect(screen.getByTestId("guest-banner")).toBeInTheDocument();
    });

    it("shows select PDF message when no doc selected", () => {
        render(<EditorPage />);
        expect(screen.getByText("Seleziona un PDF")).toBeInTheDocument();
    });

    it("shows locked overlay for password-protected PDF", async () => {
        mockDownloadPdf.mockRejectedValue(new Error("protetto da password"));
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "locked.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web", is_password_protected: true },
            ],
        });
        render(<EditorPage />);
        // Click on the platform icon div to select the document
        const icons = await screen.findAllByText("🌐");
        if (icons.length > 0) {
            fireEvent.click(icons[0]);
        }
        await waitFor(() => {
            expect(screen.getByText("PDF protetto")).toBeInTheDocument();
        }, { timeout: 3000 });
        expect(screen.getByText("Sblocca PDF")).toBeInTheDocument();
    });

    it("opens metadata modal", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        // Click on doc to select it
        fireEvent.click(screen.getByText("doc.pdf"));
        // Click metadata button
        fireEvent.click(screen.getByText("Metadati"));
        expect(screen.getByTestId("metadata-modal")).toBeInTheDocument();
    });

    it("opens remove pages modal", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getByText("doc.pdf"));
        fireEvent.click(screen.getByText("Rimuovi"));
        expect(screen.getByTestId("remove-modal")).toBeInTheDocument();
    });

    it("opens reorder modal", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getByText("doc.pdf"));
        fireEvent.click(screen.getByText("Riordina"));
        expect(screen.getByTestId("reorder-modal")).toBeInTheDocument();
    });

    it("opens split modal", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getByText("doc.pdf"));
        fireEvent.click(screen.getByText("Dividi"));
        expect(screen.getByTestId("split-modal")).toBeInTheDocument();
    });

    it("opens merge modal", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getByText("doc.pdf"));
        fireEvent.click(screen.getByText("Unisci"));
        expect(screen.getByTestId("merge-modal")).toBeInTheDocument();
    });

    it("opens lock modal from locked overlay", async () => {
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

    it("shows delete confirmation dialog", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        // Click delete button
        const deleteBtn = screen.getAllByTitle("Elimina")[0];
        fireEvent.click(deleteBtn);
        expect(screen.getByText("Conferma eliminazione")).toBeInTheDocument();
    });

    it("cancels delete confirmation", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getAllByTitle("Elimina")[0]);
        fireEvent.click(screen.getByText("Annulla"));
        expect(screen.queryByText("Conferma eliminazione")).not.toBeInTheDocument();
    });

    it("confirms delete and removes document", async () => {
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

    it("shows upload error message", async () => {
        mockUploadPdf.mockRejectedValue(new Error("Upload failed"));
        render(<EditorPage />);
        // Trigger file upload via the hidden input
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) {
            const file = new File(["fake-pdf"], "test.pdf", { type: "application/pdf" });
            fireEvent.change(fileInput, { target: { files: [file] } });
        }
        await waitFor(() => {
            expect(screen.getByText("Upload failed")).toBeInTheDocument();
        });
    });

    it("shows drag and drop overlay", () => {
        render(<EditorPage />);
        fireEvent.dragOver(document);
        expect(screen.getByText("Rilascia per caricare")).toBeInTheDocument();
    });

    it("hides drag overlay on drag leave", () => {
        render(<EditorPage />);
        fireEvent.dragOver(document);
        fireEvent.dragLeave(document);
        expect(screen.queryByText("Rilascia per caricare")).not.toBeInTheDocument();
    });

    it("shows metadata panel when document selected", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", pdf_creation_date: "2024-12-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getByText("doc.pdf"));
        expect(screen.getByText("Nome file")).toBeInTheDocument();
        expect(screen.getByText("Dimensione")).toBeInTheDocument();
        expect(screen.getByText("Pagine")).toBeInTheDocument();
        expect(screen.getByText("Creato")).toBeInTheDocument();
    });

    it("shows page navigation when document has pages", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 5, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        mockDownloadPdf.mockResolvedValue(new Blob(["fake"], { type: "application/pdf" }));
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getByText("doc.pdf"));
        await waitFor(() => {
            expect(screen.getByText(/1 \/ 5/)).toBeInTheDocument();
        });
    });

    it("shows error sync status icon", async () => {
        mockSyncStatus = { p1: "error" };
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await waitFor(() => {
            expect(screen.getByText("⚠️")).toBeInTheDocument();
        });
    });

    it("shows platform icon for mobile source", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "mobile" },
            ],
        });
        render(<EditorPage />);
        await waitFor(() => {
            expect(screen.getByText("📱")).toBeInTheDocument();
        });
    });

    it("shows cloud icon for unknown source", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "unknown" },
            ],
        });
        render(<EditorPage />);
        await waitFor(() => {
            expect(screen.getByText("☁️")).toBeInTheDocument();
        });
    });
});
