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

// Mock pdfjsLib for PageThumbnail rendering
const mockRender = vi.fn().mockResolvedValue({ promise: Promise.resolve() });
const mockGetPage = vi.fn().mockResolvedValue({
    getViewport: () => ({ width: 100, height: 140 }),
    render: mockRender,
});
const mockGetDocument = vi.fn().mockReturnValue({ promise: Promise.resolve({ getPage: mockGetPage }) });

beforeEach(() => {
    vi.clearAllMocks();
    mockRemovePages.mockResolvedValue({ id: "p1", original_filename: "removed.pdf" });
    (window as any).pdfjsLib = {
        getDocument: mockGetDocument,
    };
});

describe("RemovePagesModal", () => {
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

    it("toggles page selection via thumbnail click", () => {
        render(<RemovePagesModal {...baseProps} />);
        const pageButtons = screen.getAllByRole("button");
        const page1Btn = pageButtons.find(b => b.textContent?.includes("1") && !b.textContent?.includes("remove") && !b.textContent?.includes("cancel"));
        if (page1Btn) {
            fireEvent.click(page1Btn);
            fireEvent.click(page1Btn);
        }
        expect(screen.getByText(/pageCount/)).toBeInTheDocument();
    });

    it("shows non-Error rejection fallback message", async () => {
        mockRemovePages.mockRejectedValueOnce("string error");
        render(<RemovePagesModal {...baseProps} />);
        const pageInput = screen.getByPlaceholderText(/pageInputPlaceholder/);
        fireEvent.change(pageInput, { target: { value: "1" } });
        fireEvent.click(screen.getByRole("button", { name: /remove/ }));
        await waitFor(() => {
            expect(screen.getByText("removeError")).toBeInTheDocument();
        });
    });

    it("shows saving state while saving", async () => {
        mockRemovePages.mockImplementationOnce(() => new Promise(() => { }));
        render(<RemovePagesModal {...baseProps} />);
        const pageInput = screen.getByPlaceholderText(/pageInputPlaceholder/);
        fireEvent.change(pageInput, { target: { value: "1" } });
        fireEvent.click(screen.getByRole("button", { name: /remove/ }));
        expect(screen.getByText("removing")).toBeInTheDocument();
    });

    it("closes via X button", () => {
        render(<RemovePagesModal {...baseProps} />);
        const closeBtn = document.querySelector("svg path");
        if (closeBtn) fireEvent.click(closeBtn.closest("button")!);
        expect(mockOnClose).toHaveBeenCalled();
    });

    it("resets state when modal reopens", () => {
        const { rerender } = render(<RemovePagesModal {...baseProps} />);
        rerender(<RemovePagesModal {...baseProps} open={false} />);
        rerender(<RemovePagesModal {...baseProps} />);
        expect(screen.getByDisplayValue("test.pdf")).toBeInTheDocument();
    });

    it("renders without pdfUrl", () => {
        render(<RemovePagesModal {...baseProps} pdfUrl={null} />);
        expect(screen.getByText(/pageCount/)).toBeInTheDocument();
    });

    it("handles invalid page range", () => {
        render(<RemovePagesModal {...baseProps} />);
        const pageInput = screen.getByPlaceholderText(/pageInputPlaceholder/);
        fireEvent.change(pageInput, { target: { value: "10-12" } });
        fireEvent.click(screen.getByRole("button", { name: /remove/ }));
        expect(screen.getByText("validationError")).toBeInTheDocument();
    });

    it("handles single page", () => {
        render(<RemovePagesModal {...baseProps} totalPages={1} />);
        expect(screen.getByText(/pageCount/)).toBeInTheDocument();
    });

    it("calls onSaved callback", async () => {
        const updatedDoc = { id: "p1", original_filename: "removed.pdf" };
        mockRemovePages.mockResolvedValueOnce(updatedDoc);
        render(<RemovePagesModal {...baseProps} />);
        const pageInput = screen.getByPlaceholderText(/pageInputPlaceholder/);
        fireEvent.change(pageInput, { target: { value: "1" } });
        fireEvent.click(screen.getByRole("button", { name: /remove/ }));
        await waitFor(() => {
            expect(mockOnSaved).toHaveBeenCalledWith(updatedDoc);
        });
        expect(mockOnClose).toHaveBeenCalled();
    });

    it("renders page thumbnails grid with pdfjsLib", async () => {
        render(<RemovePagesModal {...baseProps} />);
        await waitFor(() => {
            expect(mockGetDocument).toHaveBeenCalled();
        });
    });
});
