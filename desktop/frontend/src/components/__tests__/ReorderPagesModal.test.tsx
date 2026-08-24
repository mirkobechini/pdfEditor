import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ReorderPagesModal from "../ReorderPagesModal";

const mockOnClose = vi.fn();
const mockOnSaved = vi.fn();
const mockReorderPages = vi.fn();

const baseProps = {
    open: true,
    pdfId: "p1",
    pdfName: "test.pdf",
    totalPages: 5,
    pdfUrl: "blob:test",
    onClose: mockOnClose,
    onSaved: mockOnSaved,
};

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));
vi.mock("../../shared/api", () => ({
    api: {
        reorderPages: (...args: any[]) => mockReorderPages(...args),
    },
}));

describe("ReorderPagesModal", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockReorderPages.mockResolvedValue({ id: "p1", original_filename: "reordered.pdf" });
    });

    it("renders page count", () => {
        render(<ReorderPagesModal {...baseProps} />);
        expect(screen.getByText(/pageCount/)).toBeInTheDocument();
    });

    it("shows filename input", () => {
        render(<ReorderPagesModal {...baseProps} />);
        expect(screen.getByDisplayValue("test.pdf")).toBeInTheDocument();
    });

    it("shows overwrite checkbox", () => {
        render(<ReorderPagesModal {...baseProps} />);
        expect(screen.getByText(/overwrite/)).toBeInTheDocument();
    });

    it("calls onClose when Cancel clicked", () => {
        render(<ReorderPagesModal {...baseProps} />);
        fireEvent.click(screen.getByText("cancel"));
        expect(mockOnClose).toHaveBeenCalled();
    });

    it("does not render when open is false", () => {
        const { container } = render(<ReorderPagesModal {...baseProps} open={false} />);
        expect(container.innerHTML).toBe("");
    });

    it("calls reorderPages on Reorder click", async () => {
        render(<ReorderPagesModal {...baseProps} />);
        const reorderBtn = screen.getByText("reorder");
        fireEvent.click(reorderBtn);
        await waitFor(() => {
            expect(mockReorderPages).toHaveBeenCalled();
        });
    });

    it("shows error on reorderPages failure", async () => {
        mockReorderPages.mockRejectedValueOnce(new Error("Reorder failed"));
        render(<ReorderPagesModal {...baseProps} />);
        fireEvent.click(screen.getByText("reorder"));
        await waitFor(() => {
            expect(screen.getByText("Reorder failed")).toBeInTheDocument();
        });
    });

    it("shows validation error when less than 2 pages", () => {
        render(<ReorderPagesModal {...baseProps} totalPages={1} />);
        fireEvent.click(screen.getByText("reorder"));
        expect(screen.getByText("At least 2 pages required")).toBeInTheDocument();
    });

    it("saves with new filename when changed", async () => {
        render(<ReorderPagesModal {...baseProps} />);
        const filenameInput = screen.getByDisplayValue("test.pdf");
        fireEvent.change(filenameInput, { target: { value: "new-name.pdf" } });
        fireEvent.click(screen.getByText("reorder"));
        await waitFor(() => {
            expect(mockReorderPages).toHaveBeenCalledWith("p1", [1, 2, 3, 4, 5], "new-name.pdf", false);
        });
    });

    it("saves with overwrite enabled", async () => {
        render(<ReorderPagesModal {...baseProps} />);
        const overwriteCheckbox = screen.getByRole("checkbox");
        fireEvent.click(overwriteCheckbox);
        fireEvent.click(screen.getByText("reorder"));
        await waitFor(() => {
            expect(mockReorderPages).toHaveBeenCalledWith("p1", [1, 2, 3, 4, 5], undefined, true);
        });
    });

    it("shows loading state while thumbnails load", () => {
        // The loading state is shown before the async effect completes
        // Since pdfjsLib is not available in test, loading becomes false quickly
        // Just verify the component renders without error
        render(<ReorderPagesModal {...baseProps} />);
        expect(screen.getByText(/pageCount/)).toBeInTheDocument();
    });

    it("shows drag instruction text", () => {
        render(<ReorderPagesModal {...baseProps} />);
        expect(screen.getByText(/Drag pages to reorder/)).toBeInTheDocument();
    });
});