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

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));
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
    expect(screen.getByText(/pageCount/)).toBeInTheDocument();
  });

  it("shows filename inputs after selecting split point", () => {
    render(<SplitPagesModal {...baseProps} />);
    const pageButtons = screen.getAllByRole("button");
    const page3Btn = pageButtons.find(b => b.textContent === "3");
    if (page3Btn) fireEvent.click(page3Btn);
    expect(screen.getByDisplayValue("testpart1Suffix")).toBeInTheDocument();
    expect(screen.getByDisplayValue("testpart2Suffix")).toBeInTheDocument();
  });

  it("shows Cancel button after selecting split point", () => {
    render(<SplitPagesModal {...baseProps} />);
    const pageButtons = screen.getAllByRole("button");
    const page3Btn = pageButtons.find(b => b.textContent === "3");
    if (page3Btn) fireEvent.click(page3Btn);
    expect(screen.getByText("cancel")).toBeInTheDocument();
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
    const splitBtn = screen.getByText("split");
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
    fireEvent.click(screen.getByText("split"));
    await waitFor(() => {
      expect(screen.getByText("Split failed")).toBeInTheDocument();
    });
  });
});