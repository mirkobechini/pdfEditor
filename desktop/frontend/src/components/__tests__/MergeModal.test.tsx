import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MergeModal from "../MergeModal";

const mockOnClose = vi.fn();
const mockOnSaved = vi.fn();

const baseProps = {
  open: true,
  pdfId: "p1",
  pdfName: "test.pdf",
  onClose: mockOnClose,
  onSaved: mockOnSaved,
};

vi.mock("../../shared/api", () => ({
  api: {
    listPdfs: vi.fn().mockImplementation(() =>
      Promise.resolve({
        items: [
          { id: "p1", original_filename: "doc1.pdf" },
          { id: "p2", original_filename: "doc2.pdf" },
          { id: "p3", original_filename: "doc3.pdf" },
        ],
        total: 3,
      })
    ),
    mergePdfs: vi.fn().mockResolvedValue({ id: "merged", original_filename: "merged.pdf" }),
  },
}));

describe("MergeModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      const btn = screen.getByRole("button", { name: /Merge/ });
      expect(btn).toBeDisabled();
    });
  });

  it("enables merge button when 2+ selected", async () => {
    render(<MergeModal {...baseProps} />);
    await waitFor(() => {
      const checkboxes = screen.getAllByRole("checkbox");
      fireEvent.click(checkboxes[1]);
    });
    const btn = screen.getByRole("button", { name: /Merge/ });
    expect(btn).not.toBeDisabled();
  });

  it("calls onClose when Cancel clicked", async () => {
    render(<MergeModal {...baseProps} />);
    await waitFor(() => {
      fireEvent.click(screen.getByText("Cancel"));
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("does not render when open is false", () => {
    const { container } = render(<MergeModal {...baseProps} open={false} />);
    expect(container.innerHTML).toBe("");
  });
});
