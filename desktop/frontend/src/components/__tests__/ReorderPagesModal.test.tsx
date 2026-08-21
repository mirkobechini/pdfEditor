import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ReorderPagesModal from "../ReorderPagesModal";

const mockOnClose = vi.fn();
const mockOnSaved = vi.fn();

const baseProps = {
    open: true,
    pdfId: "p1",
    pdfName: "test.pdf",
    totalPages: 5,
    pdfUrl: "blob:test",
    onClose: mockOnClose,
    onSaved: mockOnSaved,
};

vi.mock("../../shared/api", () => ({
    api: {
        reorderPages: vi.fn().mockResolvedValue({ id: "p1", original_filename: "reordered.pdf" }),
    },
}));

describe("ReorderPagesModal", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders page count", () => {
        render(<ReorderPagesModal {...baseProps} />);
        expect(screen.getByText(/5 pages/)).toBeInTheDocument();
    });

    it("shows filename input", () => {
        render(<ReorderPagesModal {...baseProps} />);
        expect(screen.getByDisplayValue("test.pdf")).toBeInTheDocument();
    });

    it("shows overwrite checkbox", () => {
        render(<ReorderPagesModal {...baseProps} />);
        expect(screen.getByText(/Overwrite/)).toBeInTheDocument();
    });

    it("calls onClose when Cancel clicked", () => {
        render(<ReorderPagesModal {...baseProps} />);
        fireEvent.click(screen.getByText("Cancel"));
        expect(mockOnClose).toHaveBeenCalled();
    });

    it("does not render when open is false", () => {
        const { container } = render(<ReorderPagesModal {...baseProps} open={false} />);
        expect(container.innerHTML).toBe("");
    });
});