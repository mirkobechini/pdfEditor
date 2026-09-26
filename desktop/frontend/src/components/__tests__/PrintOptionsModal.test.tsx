import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import PrintOptionsModal from "../PrintOptionsModal";

// Mock next-intl
vi.mock("next-intl", () => {
    const t = (key: string) => key;
    return { useTranslations: () => t };
});

function mockPdfJs(getPage = vi.fn().mockResolvedValue({
    getViewport: () => ({ width: 100, height: 140 }),
    render: () => ({ promise: Promise.resolve() }),
})) {
    (window as any).pdfjsLib = {
        GlobalWorkerOptions: {},
        getDocument: () => ({ promise: Promise.resolve({ getPage }) }),
    };
    return getPage;
}

describe("PrintOptionsModal", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as any);
    });

    afterEach(() => {
        delete (window as any).pdfjsLib;
        vi.restoreAllMocks();
    });

    it("returns null when closed", () => {
        render(<PrintOptionsModal open={false} onClose={() => { }} onConfirm={() => { }} />);
        expect(screen.queryByTestId("print-options-modal")).not.toBeInTheDocument();
    });

    it("renders with auto orientation and normal margin selected by default", () => {
        render(<PrintOptionsModal open={true} onClose={() => { }} onConfirm={() => { }} />);
        expect(screen.getByTestId("print-orientation-auto")).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByTestId("print-margin-normal")).toHaveAttribute("aria-pressed", "true");
    });

    it("lets the user pick orientation and margin before confirming", () => {
        const onConfirm = vi.fn();
        render(<PrintOptionsModal open={true} onClose={() => { }} onConfirm={onConfirm} />);

        fireEvent.click(screen.getByTestId("print-orientation-landscape"));
        fireEvent.click(screen.getByTestId("print-margin-none"));
        fireEvent.click(screen.getByTestId("print-confirm"));

        expect(onConfirm).toHaveBeenCalledWith({
            orientation: "landscape",
            margin: "none",
            printerName: "",
            copies: 1,
            color: "color",
            pageRange: "",
        });
    });

    it("calls onClose when the backdrop is clicked", () => {
        const onClose = vi.fn();
        render(<PrintOptionsModal open={true} onClose={onClose} onConfirm={() => { }} />);
        fireEvent.click(screen.getByTestId("print-options-modal").parentElement!);
        expect(onClose).toHaveBeenCalled();
    });

    it("does not close when clicking inside the modal content", () => {
        const onClose = vi.fn();
        render(<PrintOptionsModal open={true} onClose={onClose} onConfirm={() => { }} />);
        fireEvent.click(screen.getByTestId("print-options-modal"));
        expect(onClose).not.toHaveBeenCalled();
    });

    it("renders a live preview when pdfUrl is provided", async () => {
        mockPdfJs();
        render(<PrintOptionsModal open={true} onClose={() => { }} onConfirm={() => { }} pdfUrl="blob:fake" totalPages={3} />);
        await waitFor(() => {
            expect(screen.getByTestId("print-preview-canvas")).toBeInTheDocument();
        });
    });

    it("shows a placeholder when pdfUrl is missing", () => {
        render(<PrintOptionsModal open={true} onClose={() => { }} onConfirm={() => { }} />);
        expect(screen.queryByTestId("print-preview-canvas")).not.toBeInTheDocument();
        expect(screen.getByText("previewUnavailable")).toBeInTheDocument();
    });

    it("lets the user browse pages with the preview arrows", async () => {
        const getPage = mockPdfJs();
        render(<PrintOptionsModal open={true} onClose={() => { }} onConfirm={() => { }} pdfUrl="blob:fake" totalPages={3} />);
        await waitFor(() => {
            expect(screen.getByTestId("print-preview-page-indicator")).toHaveTextContent("1 / 3");
        });

        fireEvent.click(screen.getByTestId("print-preview-next"));
        await waitFor(() => {
            expect(screen.getByTestId("print-preview-page-indicator")).toHaveTextContent("2 / 3");
        });
        expect(getPage).toHaveBeenCalledWith(2);

        fireEvent.click(screen.getByTestId("print-preview-prev"));
        await waitFor(() => {
            expect(screen.getByTestId("print-preview-page-indicator")).toHaveTextContent("1 / 3");
        });
    });

    it("jumps the preview to the page typed into a custom range", async () => {
        // The page-range selector only exists in the Tauri (silent print) flow.
        (window as any).__TAURI_INTERNALS__ = { invoke: vi.fn().mockResolvedValue(null) };
        const getPage = mockPdfJs();
        render(<PrintOptionsModal open={true} onClose={() => { }} onConfirm={() => { }} pdfUrl="blob:fake" totalPages={5} />);
        await waitFor(() => expect(getPage).toHaveBeenCalledWith(1));

        fireEvent.click(screen.getByTestId("print-pages-range"));
        fireEvent.change(screen.getByTestId("print-pages-range-input"), { target: { value: "3-4" } });

        await waitFor(() => {
            // Restricted to the range's own pages (3 and 4) — not "3 / 5", which
            // would wrongly imply all 5 pages are still browsable.
            expect(screen.getByTestId("print-preview-page-indicator")).toHaveTextContent("previewPage 3 (1/2)");
        });
        expect(getPage).toHaveBeenCalledWith(3);

        // Navigating forward must stay within the range (3, 4) — never reach page 5.
        fireEvent.click(screen.getByTestId("print-preview-next"));
        await waitFor(() => {
            expect(screen.getByTestId("print-preview-page-indicator")).toHaveTextContent("previewPage 4 (2/2)");
        });
        expect(screen.getByTestId("print-preview-next")).toBeDisabled();

        delete (window as any).__TAURI_INTERNALS__;
    });

    it("renders the page picked while the PDF was still loading, not a stale page 1 (regression)", async () => {
        // Simulate a real (slow) PDF load: the getDocument promise resolves
        // only after the user has already typed a page range.
        (window as any).__TAURI_INTERNALS__ = { invoke: vi.fn().mockResolvedValue(null) };
        const getPage = vi.fn().mockResolvedValue({
            getViewport: () => ({ width: 100, height: 140 }),
            render: () => ({ promise: Promise.resolve() }),
        });
        let resolveDoc: (doc: any) => void = () => { };
        (window as any).pdfjsLib = {
            GlobalWorkerOptions: {},
            getDocument: () => ({ promise: new Promise((resolve) => { resolveDoc = resolve; }) }),
        };

        render(<PrintOptionsModal open={true} onClose={() => { }} onConfirm={() => { }} pdfUrl="blob:fake" totalPages={5} />);

        // User picks page 4 before the document has finished "loading".
        fireEvent.click(screen.getByTestId("print-pages-range"));
        fireEvent.change(screen.getByTestId("print-pages-range-input"), { target: { value: "4" } });
        // A single-page range has no next/prev — just "page 4", no count.
        expect(screen.getByTestId("print-preview-page-indicator")).toHaveTextContent("previewPage 4");
        expect(screen.queryByTestId("print-preview-next")).not.toBeInTheDocument();

        // The load now resolves — it must render page 4, not the stale page 1.
        resolveDoc({ getPage });
        await waitFor(() => expect(getPage).toHaveBeenCalledWith(4));
        expect(getPage).not.toHaveBeenCalledWith(1);
        expect(screen.getByTestId("print-preview-page-indicator")).toHaveTextContent("previewPage 4");

        delete (window as any).__TAURI_INTERNALS__;
    });

    it("resets to defaults each time it is reopened", () => {
        const { rerender } = render(<PrintOptionsModal open={true} onClose={() => { }} onConfirm={() => { }} />);
        fireEvent.click(screen.getByTestId("print-orientation-landscape"));
        expect(screen.getByTestId("print-orientation-landscape")).toHaveAttribute("aria-pressed", "true");

        rerender(<PrintOptionsModal open={false} onClose={() => { }} onConfirm={() => { }} />);
        rerender(<PrintOptionsModal open={true} onClose={() => { }} onConfirm={() => { }} />);

        expect(screen.getByTestId("print-orientation-auto")).toHaveAttribute("aria-pressed", "true");
    });
});
