import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ImportExportDialog from "./ImportExportDialog";
import { api } from "../lib/api";
import { downloadBlob } from "../lib/download";

vi.mock("../lib/api", () => ({
    api: {
        importFile: vi.fn(),
        exportPdf: vi.fn(),
    },
}));

vi.mock("../lib/download", () => ({
    downloadBlob: vi.fn(),
}));

describe("ImportExportDialog", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns null when closed", () => {
        const { container } = render(
            <ImportExportDialog open={false} onClose={() => { }} selectedId={null} selectedName="" />
        );
        expect(container).toBeEmpty();
    });

    it("renders import tab by default", () => {
        render(
            <ImportExportDialog open={true} onClose={() => { }} selectedId={null} selectedName="" />
        );
        expect(screen.getByText("importTab")).toBeTruthy();
        expect(screen.getByText("exportTab")).toBeTruthy();
        expect(screen.getByText("importDesc")).toBeTruthy();
    });

    it("imports a file and calls onImportSuccess", async () => {
        const onImportSuccess = vi.fn();
        const onClose = vi.fn();
        const mockDoc = { id: "new1", original_filename: "imported.pdf" };
        (api.importFile as any).mockResolvedValue(mockDoc);

        render(
            <ImportExportDialog
                open={true}
                onClose={onClose}
                selectedId={null}
                selectedName=""
                onImportSuccess={onImportSuccess}
            />
        );

        const fileInput = screen.getByLabelText("chooseFile") as HTMLInputElement;
        const file = new File(["hello"], "hello.txt", { type: "text/plain" });
        fireEvent.change(fileInput, { target: { files: [file] } });

        const importBtn = screen.getByText("import");
        fireEvent.click(importBtn);

        await waitFor(() => {
            expect(api.importFile).toHaveBeenCalledWith(file);
            expect(onImportSuccess).toHaveBeenCalledWith(mockDoc);
            expect(onClose).toHaveBeenCalled();
        });
    });

    it("imports a DOCX file", async () => {
        const onImportSuccess = vi.fn();
        const onClose = vi.fn();
        const mockDoc = { id: "new1", original_filename: "doc.pdf" };
        (api.importFile as any).mockResolvedValue(mockDoc);

        render(
            <ImportExportDialog
                open={true}
                onClose={onClose}
                selectedId={null}
                selectedName=""
                onImportSuccess={onImportSuccess}
            />
        );

        const fileInput = screen.getByLabelText("chooseFile") as HTMLInputElement;
        const file = new File(["docx"], "doc.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
        fireEvent.change(fileInput, { target: { files: [file] } });

        const importBtn = screen.getByText("import");
        fireEvent.click(importBtn);

        await waitFor(() => {
            expect(api.importFile).toHaveBeenCalledWith(file);
            expect(onImportSuccess).toHaveBeenCalledWith(mockDoc);
            expect(onClose).toHaveBeenCalled();
        });
    });

    it("shows error when import fails", async () => {
        (api.importFile as any).mockRejectedValue(new Error("boom"));

        render(
            <ImportExportDialog open={true} onClose={() => { }} selectedId={null} selectedName="" />
        );

        const fileInput = screen.getByLabelText("chooseFile") as HTMLInputElement;
        const file = new File(["hello"], "hello.txt", { type: "text/plain" });
        fireEvent.change(fileInput, { target: { files: [file] } });

        fireEvent.click(screen.getByText("import"));

        await waitFor(() => {
            expect(screen.getByText(/importFailed/)).toBeTruthy();
        });
    });

    it("exports the selected PDF and downloads the blob", async () => {
        const mockBlob = new Blob(["data"], { type: "text/plain" });
        (api.exportPdf as any).mockResolvedValue(mockBlob);

        render(
            <ImportExportDialog
                open={true}
                onClose={() => { }}
                selectedId="p1"
                selectedName="doc.pdf"
            />
        );

        fireEvent.click(screen.getByText("exportTab"));
        fireEvent.click(screen.getByText("export"));

        await waitFor(() => {
            expect(api.exportPdf).toHaveBeenCalledWith("p1", "txt");
            expect(downloadBlob).toHaveBeenCalledWith(mockBlob, "doc.txt");
        });
    });

    it("shows error when no PDF selected for export", async () => {
        render(
            <ImportExportDialog open={true} onClose={() => { }} selectedId={null} selectedName="" />
        );

        fireEvent.click(screen.getByText("exportTab"));
        fireEvent.click(screen.getByText("export"));

        await waitFor(() => {
            expect(screen.getByText(/noPdfSelected/)).toBeTruthy();
        });
        expect(api.exportPdf).not.toHaveBeenCalled();
    });

    it("shows the selected file name after choosing a file", () => {
        render(
            <ImportExportDialog open={true} onClose={() => { }} selectedId={null} selectedName="" />
        );

        const fileInput = screen.getByLabelText("chooseFile") as HTMLInputElement;
        const file = new File(["hello"], "hello.txt", { type: "text/plain" });
        fireEvent.change(fileInput, { target: { files: [file] } });

        expect(screen.getByText("hello.txt")).toBeTruthy();
    });

    it("shows success message after export", async () => {
        const mockBlob = new Blob(["data"], { type: "text/plain" });
        (api.exportPdf as any).mockResolvedValue(mockBlob);

        render(
            <ImportExportDialog
                open={true}
                onClose={() => { }}
                selectedId="p1"
                selectedName="doc.pdf"
            />
        );

        fireEvent.click(screen.getByText("exportTab"));
        fireEvent.click(screen.getByText("export"));

        await waitFor(() => {
            expect(screen.getByText(/exportSuccess/)).toBeTruthy();
        });
    });

    it("shows error when export fails", async () => {
        (api.exportPdf as any).mockRejectedValue(new Error("boom"));

        render(
            <ImportExportDialog
                open={true}
                onClose={() => { }}
                selectedId="p1"
                selectedName="doc.pdf"
            />
        );

        fireEvent.click(screen.getByText("exportTab"));
        fireEvent.click(screen.getByText("export"));

        await waitFor(() => {
            expect(screen.getByText(/exportFailed/)).toBeTruthy();
        });
    });

    it("switches back to import tab and changes export format and name", async () => {
        render(
            <ImportExportDialog
                open={true}
                onClose={() => { }}
                selectedId="p1"
                selectedName="doc.pdf"
            />
        );

        // Switch to export tab
        fireEvent.click(screen.getByText("exportTab"));
        expect(screen.getByText("exportDesc")).toBeTruthy();

        // Change export format
        const formatSelect = screen.getByText("exportFormat").closest("div")?.querySelector("select");
        fireEvent.change(formatSelect!, { target: { value: "png" } });

        // Change export name
        const nameInput = screen.getByText("exportName").closest("div")?.querySelector("input");
        fireEvent.change(nameInput!, { target: { value: "custom" } });

        // Switch back to import tab
        fireEvent.click(screen.getByText("importTab"));
        expect(screen.getByText("importDesc")).toBeTruthy();
    });

    it("clears selected file when file input is cleared", () => {
        render(
            <ImportExportDialog open={true} onClose={() => { }} selectedId={null} selectedName="" />
        );

        const fileInput = screen.getByLabelText("chooseFile") as HTMLInputElement;
        const file = new File(["hello"], "hello.txt", { type: "text/plain" });
        fireEvent.change(fileInput, { target: { files: [file] } });
        expect(screen.getByText("hello.txt")).toBeTruthy();

        // Clear the file selection
        fireEvent.change(fileInput, { target: { files: [] } });
        expect(screen.queryByText("hello.txt")).toBeNull();
    });
});