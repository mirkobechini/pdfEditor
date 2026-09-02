import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import ReorderDialog from "../ReorderDialog";

vi.mock("../../lib/api", () => ({
    api: {
        downloadPdf: vi.fn(),
        reorderPages: vi.fn(),
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
    totalPages: 3,
    onSuccess: vi.fn(),
};

beforeEach(() => { vi.clearAllMocks(); });

describe("ReorderDialog", () => {
    it("renders when open", () => {
        render(<ReorderDialog {...defaultProps} />);
        expect(screen.getByText("title")).toBeInTheDocument();
    });

    it("does not render when closed", () => {
        const { container } = render(<ReorderDialog {...defaultProps} open={false} />);
        expect(container).toBeEmptyDOMElement();
    });

    it("shows file info", () => {
        render(<ReorderDialog {...defaultProps} />);
        expect(screen.getByText(/test.pdf/)).toBeInTheDocument();
        expect(screen.getByText(/3/)).toBeInTheDocument();
    });

    it("shows loading spinner while thumbnails load", () => {
        (api.downloadPdf as any).mockImplementation(() => new Promise(() => { }));
        render(<ReorderDialog {...defaultProps} />);
        expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });

    it("shows error message when thumbnails fail to load", async () => {
        (api.downloadPdf as any).mockRejectedValue(new Error("Load failed"));
        render(<ReorderDialog {...defaultProps} />);
        expect(await screen.findByText(/failed/)).toBeInTheDocument();
    });

    it("calls onClose when overlay clicked", () => {
        const onClose = vi.fn();
        render(<ReorderDialog {...defaultProps} onClose={onClose} />);
        fireEvent.click(screen.getByText("title").closest(".fixed")!);
        expect(onClose).toHaveBeenCalled();
    });

    it("shows noPreview when thumbnails empty", async () => {
        (api.downloadPdf as any).mockResolvedValue(new Blob(["fake"]));
        (window as any).pdfjsLib = {
            getDocument: () => ({ promise: Promise.resolve({ numPages: 0 }) }),
        };
        render(<ReorderDialog {...defaultProps} />);
        expect(await screen.findByText("noPreview")).toBeInTheDocument();
    });

    it("renders thumbnails and page numbers", async () => {
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
        render(<ReorderDialog {...defaultProps} />);
        // Page numbers 1, 2, 3 rendered as position badges
        expect(await screen.findByText("1")).toBeInTheDocument();
        expect(screen.getByText("2")).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("moves page up with ▲ button", async () => {
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
        render(<ReorderDialog {...defaultProps} />);
        await screen.findByText("1");

        // Click ▲ on the second page (position 1)
        const upButtons = screen.getAllByTitle("moveUp");
        fireEvent.click(upButtons[1]);
        // After move, reorder button should be enabled
        const reorderBtn = screen.getByText("reorder");
        expect(reorderBtn).not.toBeDisabled();
    });

    it("moves page down with ▼ button", async () => {
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
        render(<ReorderDialog {...defaultProps} />);
        await screen.findByText("1");

        const downButtons = screen.getAllByTitle("moveDown");
        fireEvent.click(downButtons[0]);
        const reorderBtn = screen.getByText("reorder");
        expect(reorderBtn).not.toBeDisabled();
    });

    it("calls reorderPages and downloads result on success", async () => {
        const mockPage = {
            getViewport: () => ({ width: 100, height: 150 }),
            render: () => ({ promise: Promise.resolve() }),
        };
        (api.downloadPdf as any)
            .mockResolvedValueOnce(new Blob(["fake"])) // thumbnails
            .mockResolvedValueOnce(new Blob(["result"])); // result download
        (api.reorderPages as any).mockResolvedValue({ id: "new-id" });
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
        render(<ReorderDialog {...defaultProps} onSuccess={onSuccess} onClose={onClose} />);
        await screen.findByText("1");

        // Change order to enable reorder button
        const downButtons = screen.getAllByTitle("moveDown");
        fireEvent.click(downButtons[0]);

        const reorderBtn = screen.getByText("reorder");
        fireEvent.click(reorderBtn);

        await waitFor(() => {
            expect(api.reorderPages).toHaveBeenCalled();
        });
        expect(downloadBlob).toHaveBeenCalled();
        expect(onSuccess).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
    });

    it("shows error when reorderPages fails", async () => {
        const mockPage = {
            getViewport: () => ({ width: 100, height: 150 }),
            render: () => ({ promise: Promise.resolve() }),
        };
        (api.downloadPdf as any).mockResolvedValue(new Blob(["fake"]));
        (api.reorderPages as any).mockRejectedValue(new Error("Reorder failed"));
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
        render(<ReorderDialog {...defaultProps} />);
        await screen.findByText("1");

        const downButtons = screen.getAllByTitle("moveDown");
        fireEvent.click(downButtons[0]);
        fireEvent.click(screen.getByText("reorder"));

        expect(await screen.findByText(/Reorder failed/)).toBeInTheDocument();
    });

    it("handles drag and drop reorder", async () => {
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
        render(<ReorderDialog {...defaultProps} />);
        await screen.findByText("1");

        // Simulate drag start on first item, drop on second
        const items = screen.getAllByTitle("moveUp").map((btn) => btn.closest(".relative")!);
        fireEvent.dragStart(items[0]);
        fireEvent.dragOver(items[1]);
        fireEvent.drop(items[1]);
        fireEvent.dragEnd(items[0]);

        const reorderBtn = screen.getByText("reorder");
        expect(reorderBtn).not.toBeDisabled();
    });
});