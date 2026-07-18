import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import MergeDialog from "../MergeDialog";

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}));

vi.mock("../../lib/api", () => ({
    api: {
        listPdfs: vi.fn(),
        mergePdfs: vi.fn(),
        downloadPdf: vi.fn(),
    },
}));

import { api } from "../../lib/api";

const defaultProps = {
    open: true,
    onClose: vi.fn(),
    selectedId: "pdf-1",
    onMergeComplete: vi.fn(),
};

const mockFiles = [
    { id: "pdf-1", original_filename: "first.pdf", file_size: 100, page_count: 3, created_at: "", updated_at: "" },
    { id: "pdf-2", original_filename: "second.pdf", file_size: 200, page_count: 5, created_at: "", updated_at: "" },
    { id: "pdf-3", original_filename: "third.pdf", file_size: 150, page_count: 4, created_at: "", updated_at: "" },
];

beforeEach(() => { vi.clearAllMocks(); });

describe("MergeDialog", () => {
    it("renders when open", async () => {
        (api.listPdfs as any).mockResolvedValue({ items: mockFiles, total: 3 });
        render(<MergeDialog {...defaultProps} />);
        expect(await screen.findByText("title")).toBeInTheDocument();
    });

    it("does not render when closed", () => {
        const { container } = render(<MergeDialog {...defaultProps} open={false} />);
        expect(container).toBeEmptyDOMElement();
    });

    it("lists available PDFs", async () => {
        (api.listPdfs as any).mockResolvedValue({ items: mockFiles, total: 3 });
        render(<MergeDialog {...defaultProps} />);
        expect(await screen.findByText("first.pdf")).toBeInTheDocument();
        expect(screen.getByText("second.pdf")).toBeInTheDocument();
        expect(screen.getByText("third.pdf")).toBeInTheDocument();
    });

    it("pre-selects the current PDF", async () => {
        (api.listPdfs as any).mockResolvedValue({ items: mockFiles, total: 3 });
        render(<MergeDialog {...defaultProps} selectedId="pdf-1" />);
        await waitFor(() => {
            const checkbox = screen.getByText("first.pdf").closest("label")!.querySelector("input")!;
            expect(checkbox.checked).toBe(true);
        });
    });

    it("toggles file selection on click", async () => {
        (api.listPdfs as any).mockResolvedValue({ items: mockFiles, total: 3 });
        render(<MergeDialog {...defaultProps} />);
        await screen.findByText("first.pdf");

        const checkbox = screen.getByText("first.pdf").closest("label")!.querySelector("input")!;
        fireEvent.click(checkbox);
        expect(checkbox.checked).toBe(false);
        fireEvent.click(checkbox);
        expect(checkbox.checked).toBe(true);
    });

    it("disables merge button when less than 2 files selected", async () => {
        (api.listPdfs as any).mockResolvedValue({ items: mockFiles, total: 3 });
        render(<MergeDialog {...defaultProps} selectedId={null} />);
        await screen.findByText("title");
        expect(screen.getByText("merge")).toBeDisabled();
    });

    it("enables merge button when 2+ files selected", async () => {
        (api.listPdfs as any).mockResolvedValue({ items: mockFiles, total: 3 });
        render(<MergeDialog {...defaultProps} />);
        await screen.findByText("first.pdf");
        // Pre-selected pdf-1, select pdf-2
        const secondCheckbox = screen.getByText("second.pdf").closest("label")!.querySelector("input")!;
        fireEvent.click(secondCheckbox);
        expect(screen.getByText("merge")).toBeEnabled();
    });

    it("calls mergePdfs on merge", async () => {
        (api.listPdfs as any).mockResolvedValue({ items: mockFiles, total: 3 });
        (api.mergePdfs as any).mockResolvedValue({ id: "merged-id", original_filename: "merged.pdf" });
        (api.downloadPdf as any).mockResolvedValue(new Blob(["fake"], { type: "application/pdf" }));

        render(<MergeDialog {...defaultProps} />);
        await screen.findByText("first.pdf");

        const secondCheckbox = screen.getByText("second.pdf").closest("label")!.querySelector("input")!;
        fireEvent.click(secondCheckbox);

        fireEvent.click(screen.getByText("merge"));
        await waitFor(() => {
            expect(api.mergePdfs).toHaveBeenCalledWith(["pdf-1", "pdf-2"]);
        });
    });

    it("shows error on merge failure", async () => {
        (api.listPdfs as any).mockResolvedValue({ items: mockFiles, total: 3 });
        (api.mergePdfs as any).mockRejectedValue(new Error("Merge failed"));

        render(<MergeDialog {...defaultProps} />);
        await screen.findByText("first.pdf");

        const secondCheckbox = screen.getByText("second.pdf").closest("label")!.querySelector("input")!;
        fireEvent.click(secondCheckbox);

        fireEvent.click(screen.getByText("merge"));
        expect(await screen.findByText(/failed/)).toBeInTheDocument();
    });

    it("shows merging loading state", async () => {
        (api.listPdfs as any).mockResolvedValue({ items: mockFiles, total: 3 });
        (api.mergePdfs as any).mockImplementation(() => new Promise(() => { }));

        render(<MergeDialog {...defaultProps} />);
        await screen.findByText("first.pdf");

        const secondCheckbox = screen.getByText("second.pdf").closest("label")!.querySelector("input")!;
        fireEvent.click(secondCheckbox);

        fireEvent.click(screen.getByText("merge"));
        expect(await screen.findByText("merging")).toBeInTheDocument();
    });

    it("calls onClose when overlay clicked", async () => {
        const onClose = vi.fn();
        (api.listPdfs as any).mockResolvedValue({ items: mockFiles, total: 3 });
        render(<MergeDialog {...defaultProps} onClose={onClose} />);
        await screen.findByText("title");
        fireEvent.click(screen.getByText("title").closest(".fixed")!);
        expect(onClose).toHaveBeenCalled();
    });
});