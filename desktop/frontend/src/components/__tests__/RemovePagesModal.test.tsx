import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RemovePagesModal from "../RemovePagesModal";

const mockOnClose = vi.fn();
const mockOnSaved = vi.fn();
const mockRemovePages = vi.fn();

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
        removePages: (...args: any[]) => mockRemovePages(...args),
    },
}));

describe("RemovePagesModal", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRemovePages.mockResolvedValue({ id: "p1", original_filename: "removed.pdf" });
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

    it("calls removePages on Remove click", async () => {
        render(<RemovePagesModal {...baseProps} />);
        // The button says "Remove 0 pages" when no pages selected
        // We need to select pages first
        const pageInput = screen.getByPlaceholderText(/1,3,5/);
        fireEvent.change(pageInput, { target: { value: "1" } });
        const removeBtn = screen.getByRole("button", { name: /Remove/ });
        fireEvent.click(removeBtn);
        await waitFor(() => {
            expect(mockRemovePages).toHaveBeenCalled();
        });
    });

    it("shows error on removePages failure", async () => {
        mockRemovePages.mockRejectedValueOnce(new Error("Remove failed"));
        render(<RemovePagesModal {...baseProps} />);
        const pageInput = screen.getByPlaceholderText(/1,3,5/);
        fireEvent.change(pageInput, { target: { value: "1" } });
        const removeBtn = screen.getByRole("button", { name: /Remove/ });
        fireEvent.click(removeBtn);
        await waitFor(() => {
            expect(screen.getByText("Remove failed")).toBeInTheDocument();
        });
    });
});
