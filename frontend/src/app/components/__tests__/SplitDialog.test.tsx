import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import SplitDialog from "../SplitDialog";

vi.mock("../../lib/api", () => ({
    api: {
        listPdfs: vi.fn(),
        splitPdf: vi.fn(),
        downloadPdf: vi.fn(),
    },
}));

vi.mock("../../lib/usePdfJs", () => ({
    usePdfJs: () => true,
}));

vi.mock("../../lib/download", () => ({
    downloadBlob: vi.fn(),
}));

vi.mock("../../lib/error-map", () => ({
    mapError: (err: unknown) => (err instanceof Error ? err.message : String(err)),
}));

import { api } from "../../lib/api";
import { downloadBlob } from "../../lib/download";

const defaultProps = {
    open: true,
    onClose: vi.fn(),
    selectedId: "pdf-123",
    selectedName: "test.pdf",
    totalPages: 5,
    onSuccess: vi.fn(),
};

describe("SplitDialog", () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it("renders when open", () => {
        render(<SplitDialog {...defaultProps} />);
        expect(screen.getByText("title")).toBeInTheDocument();
    });

    it("does not render when closed", () => {
        const { container } = render(<SplitDialog {...defaultProps} open={false} />);
        expect(container).toBeEmptyDOMElement();
    });

    it("shows file info", () => {
        render(<SplitDialog {...defaultProps} />);
        expect(screen.getByText(/test.pdf/)).toBeInTheDocument();
        expect(screen.getByText(/5/)).toBeInTheDocument();
    });

    it("shows loading spinner while thumbnails load", () => {
        (api.downloadPdf as any).mockImplementation(() => new Promise(() => { }));
        render(<SplitDialog {...defaultProps} />);
        expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });

    it("shows error message when thumbnails fail to load", async () => {
        (api.downloadPdf as any).mockRejectedValue(new Error("Load failed"));
        render(<SplitDialog {...defaultProps} />);
        expect(await screen.findByText(/failed/)).toBeInTheDocument();
    });

    it("calls onClose when overlay clicked", () => {
        const onClose = vi.fn();
        render(<SplitDialog {...defaultProps} onClose={onClose} />);
        fireEvent.click(screen.getByText("title").closest(".fixed")!);
        expect(onClose).toHaveBeenCalled();
    });

    it("shows preview unavailable when no thumbnails", async () => {
        (api.downloadPdf as any).mockResolvedValue(new Blob(["fake"]));
        (window as any).pdfjsLib = {
            getDocument: () => ({ promise: Promise.resolve({ numPages: 0 }) }),
        };
        render(<SplitDialog {...defaultProps} />);
        expect(await screen.findByText("Preview unavailable")).toBeInTheDocument();
    });

    it("renders thumbnails and preview sections when PDF loads", async () => {
        const mockPage = {
            getViewport: () => ({ width: 100, height: 150 }),
            render: () => ({ promise: Promise.resolve() }),
        };
        (api.downloadPdf as any).mockResolvedValue(new Blob(["fake"]));
        (window as any).pdfjsLib = {
            getDocument: () => ({
                promise: Promise.resolve({
                    numPages: 3,
                    getPage: () => Promise.resolve(mockPage),
                }),
            }),
        };
        HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({ scale: vi.fn() });
        HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue("data:image/png;base64,x");
        render(<SplitDialog {...defaultProps} totalPages={3} />);
        expect(await screen.findByText("Documenti risultanti:")).toBeInTheDocument();
    });

    it("toggles cut and updates preview sections", async () => {
        const mockPage = {
            getViewport: () => ({ width: 100, height: 150 }),
            render: () => ({ promise: Promise.resolve() }),
        };
        (api.downloadPdf as any).mockResolvedValue(new Blob(["fake"]));
        (window as any).pdfjsLib = {
            getDocument: () => ({
                promise: Promise.resolve({
                    numPages: 3,
                    getPage: () => Promise.resolve(mockPage),
                }),
            }),
        };
        HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({ scale: vi.fn() });
        HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue("data:image/png;base64,x");
        render(<SplitDialog {...defaultProps} totalPages={3} />);
        await screen.findByText("Documenti risultanti:");

        // Click separator between page 1 and 2
        const separators = screen.getAllByTitle("Aggiungi separazione");
        fireEvent.click(separators[0]);

        // Preview should show two documents now
        expect(screen.getByText(/page.*1/)).toBeInTheDocument();
        expect(screen.getAllByTitle("Rimuovi separazione").length).toBe(1);

        // Click again to remove
        fireEvent.click(screen.getAllByTitle("Rimuovi separazione")[0]);
        expect(screen.getAllByTitle("Aggiungi separazione").length).toBe(2);
    });

    it("calls splitPdf and downloads result on success", async () => {
        const mockPage = {
            getViewport: () => ({ width: 100, height: 150 }),
            render: () => ({ promise: Promise.resolve() }),
        };
        (api.downloadPdf as any)
            .mockResolvedValueOnce(new Blob(["fake"])) // thumbnails
            .mockResolvedValueOnce(new Blob(["result"])); // result download
        (api.splitPdf as any).mockResolvedValue({ items: [{ id: "split-1" }] });
        (window as any).pdfjsLib = {
            getDocument: () => ({
                promise: Promise.resolve({
                    numPages: 3,
                    getPage: () => Promise.resolve(mockPage),
                }),
            }),
        };
        HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({ scale: vi.fn() });
        HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue("data:image/png;base64,x");
        const onSuccess = vi.fn();
        const onClose = vi.fn();
        render(<SplitDialog {...defaultProps} totalPages={3} onSuccess={onSuccess} onClose={onClose} />);
        await screen.findByText("Documenti risultanti:");

        // Click split button
        fireEvent.click(screen.getByText("split"));

        await waitFor(() => {
            expect(api.splitPdf).toHaveBeenCalled();
        });
        expect(downloadBlob).toHaveBeenCalled();
        expect(onSuccess).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
    });

    it("shows error when splitPdf fails", async () => {
        const mockPage = {
            getViewport: () => ({ width: 100, height: 150 }),
            render: () => ({ promise: Promise.resolve() }),
        };
        (api.downloadPdf as any).mockResolvedValue(new Blob(["fake"]));
        (api.splitPdf as any).mockRejectedValue(new Error("Split failed"));
        (window as any).pdfjsLib = {
            getDocument: () => ({
                promise: Promise.resolve({
                    numPages: 3,
                    getPage: () => Promise.resolve(mockPage),
                }),
            }),
        };
        HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({ scale: vi.fn() });
        HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue("data:image/png;base64,x");
        render(<SplitDialog {...defaultProps} totalPages={3} />);
        await screen.findByText("Documenti risultanti:");

        fireEvent.click(screen.getByText("split"));

        expect(await screen.findByText(/Split failed/)).toBeInTheDocument();
    });
});