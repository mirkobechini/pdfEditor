import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RemovePagesModal from "../RemovePagesModal";

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
        removePages: vi.fn().mockResolvedValue({ id: "p1", original_filename: "removed.pdf" }),
    },
}));

describe("RemovePagesModal", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders page count", () => {
        render(<RemovePagesModal {...baseProps} />);
        expect(screen.getByText(/5 pages/)).toBeInTheDocument();
    });

    it("shows filename input", () => {
        render(<RemovePagesModal {...baseProps} />);
        expect(screen.getByDisplayValue("test.pdf")).toBeInTheDocument();
    });

    it("shows overwrite checkbox", () => {
        render(<RemovePagesModal {...baseProps} />);
        expect(screen.getByText(/Overwrite/)).toBeInTheDocument();
    });

    it("calls onClose when Cancel clicked", () => {
        render(<RemovePagesModal {...baseProps} />);
        fireEvent.click(screen.getByText("Cancel"));
        expect(mockOnClose).toHaveBeenCalled();
    });

    it("does not render when open is false", () => {
        const { container } = render(<RemovePagesModal {...baseProps} open={false} />);
        expect(container.innerHTML).toBe("");
    });
});