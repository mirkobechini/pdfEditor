import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SplitPagesModal from "../SplitPagesModal";

const mockOnClose = vi.fn();
const mockOnSaved = vi.fn();
const mockSplitPdf = vi.fn();

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
    splitPdf: (...args: any[]) => mockSplitPdf(...args),
  },
}));

describe("SplitPagesModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSplitPdf.mockResolvedValue({ items: [{ id: "s1" }, { id: "s2" }] });
  });

  it("renders page count", () => {
    render(<SplitPagesModal {...baseProps} />);
    expect(screen.getByText(/5 pages/)).toBeInTheDocument();
  });

  it("shows filename inputs after selecting split point", () => {
    render(<SplitPagesModal {...baseProps} />);
    const pageButtons = screen.getAllByRole("button");
    const page3Btn = pageButtons.find(b => b.textContent === "3");
    if (page3Btn) fireEvent.click(page3Btn);
    expect(screen.getByDisplayValue("test_part1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("test_part2")).toBeInTheDocument();
  });

  it("shows Cancel button after selecting split point", () => {
    render(<SplitPagesModal {...baseProps} />);
    const pageButtons = screen.getAllByRole("button");
    const page3Btn = pageButtons.find(b => b.textContent === "3");
    if (page3Btn) fireEvent.click(page3Btn);
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("does not render when open is false", () => {
    const { container } = render(<SplitPagesModal {...baseProps} open={false} />);
    expect(container.innerHTML).toBe("");
  });

  it("calls splitPdf on Split click", async () => {
    render(<SplitPagesModal {...baseProps} />);
    const pageButtons = screen.getAllByRole("button");
    const page3Btn = pageButtons.find(b => b.textContent === "3");
    if (page3Btn) fireEvent.click(page3Btn);
    const splitBtn = screen.getByText("Split");
    fireEvent.click(splitBtn);
    await waitFor(() => {
      expect(mockSplitPdf).toHaveBeenCalled();
    });
  });

  it("shows error on splitPdf failure", async () => {
    mockSplitPdf.mockRejectedValueOnce(new Error("Split failed"));
    render(<SplitPagesModal {...baseProps} />);
    const pageButtons = screen.getAllByRole("button");
    const page3Btn = pageButtons.find(b => b.textContent === "3");
    if (page3Btn) fireEvent.click(page3Btn);
    fireEvent.click(screen.getByText("Split"));
    await waitFor(() => {
      expect(screen.getByText("Split failed")).toBeInTheDocument();
    });
  });
});