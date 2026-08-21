import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SplitPagesModal from "../SplitPagesModal";

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
    splitPdf: vi.fn().mockResolvedValue({ items: [{ id: "s1" }, { id: "s2" }] }),
  },
}));

describe("SplitPagesModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
