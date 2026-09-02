import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MergeModal from "../MergeModal";

const mockOnClose = vi.fn();
const mockOnSaved = vi.fn();
const mockListPdfs = vi.fn();
const mockMergePdfs = vi.fn();

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));

const baseProps = {
  open: true,
  pdfId: "p1",
  pdfName: "test.pdf",
  onClose: mockOnClose,
  onSaved: mockOnSaved,
};

vi.mock("../../shared/api", () => ({
  api: {
    listPdfs: (...args: any[]) => mockListPdfs(...args),
    mergePdfs: (...args: any[]) => mockMergePdfs(...args),
  },
}));

describe("MergeModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListPdfs.mockResolvedValue({
      items: [
        { id: "p1", original_filename: "doc1.pdf" },
        { id: "p2", original_filename: "doc2.pdf" },
        { id: "p3", original_filename: "doc3.pdf" },
      ],
      total: 3,
    });
    mockMergePdfs.mockResolvedValue({ id: "merged", original_filename: "merged.pdf" });
  });

  it("renders PDF list with checkboxes", async () => {
    render(<MergeModal {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByText("doc1.pdf")).toBeInTheDocument();
    });
    expect(screen.getByText("doc2.pdf")).toBeInTheDocument();
    expect(screen.getByText("doc3.pdf")).toBeInTheDocument();
  });

  it("pre-selects current PDF", async () => {
    render(<MergeModal {...baseProps} />);
    await waitFor(() => {
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes[0]).toBeChecked();
    });
  });

  it("disables merge button when less than 2 selected", async () => {
    render(<MergeModal {...baseProps} />);
    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /merge/ });
      expect(btn).toBeDisabled();
    });
  });

  it("enables merge button when 2+ selected", async () => {
    render(<MergeModal {...baseProps} />);
    await waitFor(() => {
      const checkboxes = screen.getAllByRole("checkbox");
      fireEvent.click(checkboxes[1]);
    });
    const btn = screen.getByRole("button", { name: /merge/ });
    expect(btn).not.toBeDisabled();
  });

  it("calls mergePdfs on Merge click", async () => {
    render(<MergeModal {...baseProps} />);
    await waitFor(() => {
      const checkboxes = screen.getAllByRole("checkbox");
      fireEvent.click(checkboxes[1]);
    });
    fireEvent.click(screen.getByRole("button", { name: /merge/ }));
    await waitFor(() => {
      expect(mockMergePdfs).toHaveBeenCalled();
    });
  });

  it("shows error on merge failure", async () => {
    mockMergePdfs.mockRejectedValueOnce(new Error("Merge failed"));
    render(<MergeModal {...baseProps} />);
    await waitFor(() => {
      const checkboxes = screen.getAllByRole("checkbox");
      fireEvent.click(checkboxes[1]);
    });
    fireEvent.click(screen.getByRole("button", { name: /merge/ }));
    await waitFor(() => {
      expect(screen.getByText("Merge failed")).toBeInTheDocument();
    });
  });

  it("calls onClose when Cancel clicked", async () => {
    render(<MergeModal {...baseProps} />);
    await waitFor(() => {
      fireEvent.click(screen.getByText("cancel"));
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("does not render when open is false", () => {
    const { container } = render(<MergeModal {...baseProps} open={false} />);
    expect(container.innerHTML).toBe("");
  });
});
