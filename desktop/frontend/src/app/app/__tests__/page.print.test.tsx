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

    it("1k: toolbar print button opens print options modal", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getByText("doc.pdf"));
        await waitFor(() => {
            expect(screen.getByTestId("toolbar-print")).toBeInTheDocument();
        });

        // handlePrint captures the canvas preview synchronously on click.
        vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,test");
        vi.spyOn(document, "querySelector").mockReturnValue(document.createElement("canvas"));

        fireEvent.click(screen.getByTestId("toolbar-print"));

        expect(screen.getByTestId("print-options-modal")).toBeInTheDocument();
        vi.restoreAllMocks();
    });
    it("1k: confirming print options converts canvas to img and calls window.print", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getByText("doc.pdf"));
        await waitFor(() => {
            expect(screen.getByTestId("toolbar-print")).toBeInTheDocument();
        });

        // Mock canvas/image methods at prototype level (doesn't break React)
        vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,test");
        vi.spyOn(document, "querySelector").mockReturnValue(document.createElement("canvas"));
        // jsdom doesn't implement HTMLImageElement.decode() at all.
        (HTMLImageElement.prototype as any).decode = vi.fn().mockResolvedValue(undefined);

        fireEvent.click(screen.getByTestId("toolbar-print"));
        await waitFor(() => {
            expect(screen.getByTestId("print-confirm")).toBeInTheDocument();
        });

        const mockPrint = vi.fn();
        vi.spyOn(window, "print").mockImplementation(mockPrint);

        fireEvent.click(screen.getByTestId("print-confirm"));

        await waitFor(() => {
            expect(mockPrint).toHaveBeenCalled();
        });
        expect(screen.queryByTestId("print-options-modal")).not.toBeInTheDocument();

        delete (HTMLImageElement.prototype as any).decode;
        vi.restoreAllMocks();
    });
    it("1k: in Tauri, confirming print options silently prints via print_pages (no OS dialog)", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        mockIsTauri = true;
        mockTauriInvoke.mockImplementation((cmd: string) => {
            if (cmd === "list_printers") {
                return Promise.resolve({ printers: ["HP LaserJet"], defaultPrinter: "HP LaserJet" });
            }
            return Promise.resolve(null);
        });
        (window as any).pdfjsLib = {
            GlobalWorkerOptions: {},
            getDocument: () => ({
                promise: Promise.resolve({
                    getPage: () => Promise.resolve({
                        getViewport: () => ({ width: 100, height: 140 }),
                        render: () => ({ promise: Promise.resolve() }),
                    }),
                }),
            }),
        };
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getByText("doc.pdf"));
        await waitFor(() => {
            expect(screen.getByTestId("toolbar-print")).toBeInTheDocument();
        });

        vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,test");
        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as any);
        vi.spyOn(document, "querySelector").mockReturnValue(document.createElement("canvas"));
        (HTMLImageElement.prototype as any).decode = vi.fn().mockResolvedValue(undefined);

        fireEvent.click(screen.getByTestId("toolbar-print"));
        await waitFor(() => {
            expect(screen.getByTestId("print-printer-select")).toBeInTheDocument();
        });

        const mockPrint = vi.fn();
        vi.spyOn(window, "print").mockImplementation(mockPrint);

        fireEvent.click(screen.getByTestId("print-confirm"));

        await waitFor(() => {
            expect(mockTauriInvoke).toHaveBeenCalledWith(
                "print_pages",
                expect.objectContaining({
                    request: expect.objectContaining({ printerName: "HP LaserJet", images: expect.any(Array) }),
                }),
            );
        });
        expect(mockPrint).not.toHaveBeenCalled();

        delete (HTMLImageElement.prototype as any).decode;
        delete (window as any).pdfjsLib;
        vi.restoreAllMocks();
        mockIsTauri = false;
    });
    it("1k: a custom page range only renders and prints the selected pages", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        mockIsTauri = true;
        mockTauriInvoke.mockImplementation((cmd: string) => {
            if (cmd === "list_printers") {
                return Promise.resolve({ printers: ["HP LaserJet"], defaultPrinter: "HP LaserJet" });
            }
            return Promise.resolve(null);
        });
        const getPage = vi.fn().mockResolvedValue({
            getViewport: () => ({ width: 100, height: 140 }),
            render: () => ({ promise: Promise.resolve() }),
        });
        (window as any).pdfjsLib = {
            GlobalWorkerOptions: {},
            getDocument: () => ({ promise: Promise.resolve({ getPage }) }),
        };
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getByText("doc.pdf"));
        await waitFor(() => {
            expect(screen.getByTestId("toolbar-print")).toBeInTheDocument();
        });

        vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,test");
        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as any);
        vi.spyOn(document, "querySelector").mockReturnValue(document.createElement("canvas"));
        (HTMLImageElement.prototype as any).decode = vi.fn().mockResolvedValue(undefined);

        fireEvent.click(screen.getByTestId("toolbar-print"));
        await waitFor(() => {
            expect(screen.getByTestId("print-pages-range")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId("print-pages-range"));
        fireEvent.change(screen.getByTestId("print-pages-range-input"), { target: { value: "1,3" } });
        fireEvent.click(screen.getByTestId("print-confirm"));

        await waitFor(() => {
            expect(mockTauriInvoke).toHaveBeenCalledWith(
                "print_pages",
                expect.objectContaining({
                    request: expect.objectContaining({ images: [expect.any(String), expect.any(String)] }),
                }),
            );
        });
        expect(getPage).toHaveBeenCalledWith(1);
        expect(getPage).toHaveBeenCalledWith(3);
        expect(getPage).not.toHaveBeenCalledWith(2);

        delete (HTMLImageElement.prototype as any).decode;
        delete (window as any).pdfjsLib;
        vi.restoreAllMocks();
        mockIsTauri = false;
    });
    it("1k: print options modal lets user choose orientation and margin before printing", async () => {
        mockListPdfs.mockResolvedValue({
            items: [
                { id: "p1", original_filename: "doc.pdf", file_size: 1024, page_count: 3, created_at: "2025-01-01T00:00:00Z", upload_source: "web" },
            ],
        });
        render(<EditorPage />);
        await screen.findByText("doc.pdf");
        fireEvent.click(screen.getByText("doc.pdf"));
        await waitFor(() => {
            expect(screen.getByTestId("toolbar-print")).toBeInTheDocument();
        });

        vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,test");
        vi.spyOn(document, "querySelector").mockReturnValue(document.createElement("canvas"));

        fireEvent.click(screen.getByTestId("toolbar-print"));

        fireEvent.click(screen.getByTestId("print-orientation-landscape"));
        fireEvent.click(screen.getByTestId("print-margin-none"));
        expect(screen.getByTestId("print-orientation-landscape")).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByTestId("print-margin-none")).toHaveAttribute("aria-pressed", "true");

        fireEvent.click(screen.getByTestId("print-options-modal")); // click inside (backdrop stopPropagation) should not close
        expect(screen.getByTestId("print-options-modal")).toBeInTheDocument();

        vi.restoreAllMocks();
    });
    it("1k: handlePrint does nothing when no document selected", async () => {
        mockListPdfs.mockResolvedValue({ items: [] });
        render(<EditorPage />);
        // The print button exists but is disabled; handlePrint returns early
        await waitFor(() => {
            expect(screen.getByTestId("toolbar-print")).toBeDisabled();
        });
    });
});
