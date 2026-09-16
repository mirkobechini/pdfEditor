import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ImportExportModal from "../ImportExportModal";

const mockOnClose = vi.fn();
const mockOnImported = vi.fn();
const mockImportFile = vi.fn();
const mockExportPdf = vi.fn();
const mockTauriInvoke = vi.fn();

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));

vi.mock("../../shared/api", () => ({
    api: {
        importFile: (...args: any[]) => mockImportFile(...args),
        exportPdf: (...args: any[]) => mockExportPdf(...args),
    },
}));

vi.mock("../../shared/tauri", () => ({
    tauriInvoke: (...args: any[]) => mockTauriInvoke(...args),
}));

vi.mock("../../hooks/useApiError", () => ({
    useApiError: () => ({ apiError: (err: unknown) => (err instanceof Error ? err.message : String(err)) }),
}));

const baseProps = {
    open: true,
    pdfId: "p1",
    pdfName: "test.pdf",
    onClose: mockOnClose,
    onImported: mockOnImported,
};

describe("ImportExportModal", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockImportFile.mockResolvedValue({ id: "imported", original_filename: "imported.pdf" });
        mockExportPdf.mockResolvedValue(new Blob(["data"], { type: "text/plain" }));
    });

    it("renders when open", () => {
        render(<ImportExportModal {...baseProps} />);
        expect(screen.getByText("title")).toBeInTheDocument();
    });

    it("does not render when closed", () => {
        const { container } = render(<ImportExportModal {...baseProps} open={false} />);
        expect(container).toBeEmptyDOMElement();
    });

    it("renders import tab by default", () => {
        render(<ImportExportModal {...baseProps} />);
        expect(screen.getByText("importTab")).toBeInTheDocument();
        expect(screen.getByText("exportTab")).toBeInTheDocument();
        expect(screen.getByText("importDesc")).toBeInTheDocument();
    });

    it("imports a file via dialog_open and read_file_binary", async () => {
        mockTauriInvoke.mockImplementation((cmd: string) => {
            if (cmd === "dialog_open") return Promise.resolve("C:\\docs\\hello.txt");
            if (cmd === "read_file_binary") return Promise.resolve([104, 105]);
            return Promise.resolve(null);
        });

        render(<ImportExportModal {...baseProps} />);
        fireEvent.click(screen.getByText("import"));

        await waitFor(() => {
            expect(mockTauriInvoke).toHaveBeenCalledWith("dialog_open", {});
            expect(mockTauriInvoke).toHaveBeenCalledWith("read_file_binary", { path: "C:\\docs\\hello.txt" });
            expect(mockImportFile).toHaveBeenCalled();
            expect(mockOnImported).toHaveBeenCalled();
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    it("does nothing when dialog_open returns null", async () => {
        mockTauriInvoke.mockResolvedValue(null);

        render(<ImportExportModal {...baseProps} />);
        fireEvent.click(screen.getByText("import"));

        await waitFor(() => {
            expect(mockImportFile).not.toHaveBeenCalled();
        });
    });

    it("does nothing when read_file_binary returns null", async () => {
        mockTauriInvoke.mockImplementation((cmd: string) => {
            if (cmd === "dialog_open") return Promise.resolve("C:\\docs\\hello.txt");
            if (cmd === "read_file_binary") return Promise.resolve(null);
            return Promise.resolve(null);
        });

        render(<ImportExportModal {...baseProps} />);
        fireEvent.click(screen.getByText("import"));

        await waitFor(() => {
            expect(mockImportFile).not.toHaveBeenCalled();
        });
    });

    it("uses fallback filename when path has no name", async () => {
        mockTauriInvoke.mockImplementation((cmd: string) => {
            if (cmd === "dialog_open") return Promise.resolve("C:\\docs\\");
            if (cmd === "read_file_binary") return Promise.resolve([104, 105]);
            return Promise.resolve(null);
        });

        render(<ImportExportModal {...baseProps} />);
        fireEvent.click(screen.getByText("import"));

        await waitFor(() => {
            expect(mockImportFile).toHaveBeenCalled();
        });
    });

    it("shows error when import fails", async () => {
        mockTauriInvoke.mockImplementation((cmd: string) => {
            if (cmd === "dialog_open") return Promise.resolve("C:\\docs\\hello.txt");
            if (cmd === "read_file_binary") return Promise.resolve([104, 105]);
            return Promise.resolve(null);
        });
        mockImportFile.mockRejectedValue(new Error("boom"));

        render(<ImportExportModal {...baseProps} />);
        fireEvent.click(screen.getByText("import"));

        await waitFor(() => {
            expect(screen.getByText("boom")).toBeInTheDocument();
        });
    });

    it("exports the selected PDF and saves via dialog_save", async () => {
        mockTauriInvoke.mockResolvedValue("C:\\saved\\test.txt");

        render(<ImportExportModal {...baseProps} />);
        fireEvent.click(screen.getByText("exportTab"));
        fireEvent.click(screen.getByText("export"));

        await waitFor(() => {
            expect(mockExportPdf).toHaveBeenCalledWith("p1", "txt");
            expect(mockTauriInvoke).toHaveBeenCalledWith("dialog_save", expect.objectContaining({
                defaultName: "test.txt",
            }));
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    it("shows error when no PDF selected for export", async () => {
        render(<ImportExportModal {...baseProps} pdfId="" />);
        fireEvent.click(screen.getByText("exportTab"));
        fireEvent.click(screen.getByText("export"));

        await waitFor(() => {
            expect(screen.getByText("noPdfSelected")).toBeInTheDocument();
        });
        expect(mockExportPdf).not.toHaveBeenCalled();
    });

    it("does not close when dialog_save is cancelled", async () => {
        mockTauriInvoke.mockResolvedValue(null);

        render(<ImportExportModal {...baseProps} />);
        fireEvent.click(screen.getByText("exportTab"));
        fireEvent.click(screen.getByText("export"));

        await waitFor(() => {
            expect(mockExportPdf).toHaveBeenCalledWith("p1", "txt");
        });
        expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("shows error when export fails", async () => {
        mockExportPdf.mockRejectedValue(new Error("export boom"));

        render(<ImportExportModal {...baseProps} />);
        fireEvent.click(screen.getByText("exportTab"));
        fireEvent.click(screen.getByText("export"));

        await waitFor(() => {
            expect(screen.getByText("export boom")).toBeInTheDocument();
        });
    });

    it("switches tabs and changes export format and name", async () => {
        render(<ImportExportModal {...baseProps} />);

        fireEvent.click(screen.getByText("exportTab"));
        expect(screen.getByText("exportDesc")).toBeInTheDocument();

        const formatSelect = screen.getByText("exportFormat").closest("div")?.querySelector("select");
        fireEvent.change(formatSelect!, { target: { value: "png" } });

        const nameInput = screen.getByText("exportName").closest("div")?.querySelector("input");
        fireEvent.change(nameInput!, { target: { value: "custom" } });

        fireEvent.click(screen.getByText("importTab"));
        expect(screen.getByText("importDesc")).toBeInTheDocument();
    });
});