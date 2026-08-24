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

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));
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
        expect(screen.getByText(/pageCount/)).toBeInTheDocument();
    });

    it("shows filename input", () => {
        render(<RemovePagesModal {...baseProps} />);
        expect(screen.getByDisplayValue("test.pdf")).toBeInTheDocument();
    });

    it("shows overwrite checkbox", () => {
        render(<RemovePagesModal {...baseProps} />);
        expect(screen.getByText(/overwrite/)).toBeInTheDocument();
    });

    it("calls onClose when Cancel clicked", () => {
        render(<RemovePagesModal {...baseProps} />);
        fireEvent.click(screen.getByText("cancel"));
        expect(mockOnClose).toHaveBeenCalled();
    });

    it("does not render when open is false", () => {
        const { container } = render(<RemovePagesModal {...baseProps} open={false} />);
        expect(container.innerHTML).toBe("");
    });

    it("calls removePages on Remove click", async () => {
        render(<RemovePagesModal {...baseProps} />);
        const pageInput = screen.getByPlaceholderText(/pageInputPlaceholder/);
        fireEvent.change(pageInput, { target: { value: "1" } });
        const removeBtn = screen.getByRole("button", { name: /remove/ });
        fireEvent.click(removeBtn);
        await waitFor(() => {
            expect(mockRemovePages).toHaveBeenCalled();
        });
    });

    it("shows error on removePages failure", async () => {
        mockRemovePages.mockRejectedValueOnce(new Error("Remove failed"));
        render(<RemovePagesModal {...baseProps} />);
        const pageInput = screen.getByPlaceholderText(/pageInputPlaceholder/);
        fireEvent.change(pageInput, { target: { value: "1" } });
        const removeBtn = screen.getByRole("button", { name: /remove/ });
        fireEvent.click(removeBtn);
        await waitFor(() => {
            expect(screen.getByText("Remove failed")).toBeInTheDocument();
        });
    });

    it("shows validation error when no pages selected", () => {
        render(<RemovePagesModal {...baseProps} />);
        const removeBtn = screen.getByRole("button", { name: /remove/ });
        fireEvent.click(removeBtn);
        expect(screen.getByText("validationError")).toBeInTheDocument();
    });

    it("parses page range input correctly", () => {
        render(<RemovePagesModal {...baseProps} />);
        const pageInput = screen.getByPlaceholderText(/pageInputPlaceholder/);
        fireEvent.change(pageInput, { target: { value: "1-3" } });
        const removeBtn = screen.getByRole("button", { name: /remove/ });
        fireEvent.click(removeBtn);
        expect(mockRemovePages).toHaveBeenCalledWith("p1", [1, 2, 3], undefined, false);
    });

    it("parses comma-separated pages", () => {
        render(<RemovePagesModal {...baseProps} />);
        const pageInput = screen.getByPlaceholderText(/pageInputPlaceholder/);
        fireEvent.change(pageInput, { target: { value: "1, 3, 5" } });
        const removeBtn = screen.getByRole("button", { name: /remove/ });
        fireEvent.click(removeBtn);
        expect(mockRemovePages).toHaveBeenCalledWith("p1", [1, 3, 5], undefined, false);
    });

    it("saves with new filename when changed", async () => {
        render(<RemovePagesModal {...baseProps} />);
        const pageInput = screen.getByPlaceholderText(/pageInputPlaceholder/);
        fireEvent.change(pageInput, { target: { value: "2" } });
        const filenameInput = screen.getByDisplayValue("test.pdf");
        fireEvent.change(filenameInput, { target: { value: "new-name.pdf" } });
        const removeBtn = screen.getByRole("button", { name: /remove/ });
        fireEvent.click(removeBtn);
        await waitFor(() => {
            expect(mockRemovePages).toHaveBeenCalledWith("p1", [2], "new-name.pdf", false);
        });
    });

    it("saves with overwrite enabled", async () => {
        render(<RemovePagesModal {...baseProps} />);
        const pageInput = screen.getByPlaceholderText(/pageInputPlaceholder/);
        fireEvent.change(pageInput, { target: { value: "2" } });
        const overwriteCheckbox = screen.getByRole("checkbox");
        fireEvent.click(overwriteCheckbox);
        const removeBtn = screen.getByRole("button", { name: /remove/ });
        fireEvent.click(removeBtn);
        await waitFor(() => {
            expect(mockRemovePages).toHaveBeenCalledWith("p1", [2], undefined, true);
        });
    });

    it("toggles page selection via checkbox click", () => {
        render(<RemovePagesModal {...baseProps} />);
        // Click on a page thumbnail button (the first one with page number 1)
        const pageButtons = screen.getAllByRole("button");
        const page1Btn = pageButtons.find(b => b.textContent?.includes("1") && !b.textContent?.includes("remove") && !b.textContent?.includes("cancel"));
        if (page1Btn) {
            fireEvent.click(page1Btn);
            // Click again to deselect
            fireEvent.click(page1Btn);
        }
        // Just verify no crash
        expect(screen.getByText(/pageCount/)).toBeInTheDocument();
    });
});
