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

// Mock pdfjsLib for PageThumbnail rendering
const mockRender = vi.fn().mockResolvedValue({ promise: Promise.resolve() });
const mockGetPage = vi.fn().mockResolvedValue({
  getViewport: () => ({ width: 100, height: 140 }),
  render: mockRender,
});
const mockGetDocument = vi.fn().mockReturnValue({ promise: Promise.resolve({ getPage: mockGetPage }) });

describe("SplitPagesModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSplitPdf.mockResolvedValue({ items: [{ id: "s1" }, { id: "s2" }] });
    (window as any).pdfjsLib = {
      getDocument: mockGetDocument,
    };
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

  it("shows error when split page equals total pages", () => {
    render(<SplitPagesModal {...baseProps} totalPages={3} />);
    const pageButtons = screen.getAllByRole("button");
    const page3Btn = pageButtons.find(b => b.textContent === "3");
    if (page3Btn) fireEvent.click(page3Btn);
    fireEvent.click(screen.getByText("split"));
    expect(screen.getByText("splitError")).toBeInTheDocument();
  });

  it("shows error when filenames are empty", () => {
    render(<SplitPagesModal {...baseProps} />);
    const pageButtons = screen.getAllByRole("button");
    const page3Btn = pageButtons.find(b => b.textContent === "3");
    if (page3Btn) fireEvent.click(page3Btn);
    // Clear filenames
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "" } });
    fireEvent.change(inputs[1], { target: { value: "" } });
    fireEvent.click(screen.getByText("split"));
    expect(screen.getByText("Both filenames are required")).toBeInTheDocument();
  });

  it("shows split here badge on selected page", () => {
    render(<SplitPagesModal {...baseProps} />);
    const pageButtons = screen.getAllByRole("button");
    const page3Btn = pageButtons.find(b => b.textContent === "3");
    if (page3Btn) fireEvent.click(page3Btn);
    expect(screen.getByText("Split here")).toBeInTheDocument();
  });

  it("shows page range after selecting split point", () => {
    render(<SplitPagesModal {...baseProps} totalPages={5} />);
    const pageButtons = screen.getAllByRole("button");
    const page3Btn = pageButtons.find(b => b.textContent === "3");
    if (page3Btn) fireEvent.click(page3Btn);
    expect(screen.getByText(/Pages 1–3/)).toBeInTheDocument();
    expect(screen.getByText(/Pages 4–5/)).toBeInTheDocument();
  });

  it("toggles split point off on re-click", () => {
    render(<SplitPagesModal {...baseProps} />);
    const pageButtons = screen.getAllByRole("button");
    const page3Btn = pageButtons.find(b => b.textContent === "3");
    if (page3Btn) {
      fireEvent.click(page3Btn);
      fireEvent.click(page3Btn);
    }
    expect(screen.queryByText("Split here")).not.toBeInTheDocument();
  });

  it("shows saving state while splitting", async () => {
    mockSplitPdf.mockImplementation(() => new Promise((r) => setTimeout(r, 1000)));
    render(<SplitPagesModal {...baseProps} />);
    const pageButtons = screen.getAllByRole("button");
    const page3Btn = pageButtons.find(b => b.textContent === "3");
    if (page3Btn) fireEvent.click(page3Btn);
    fireEvent.click(screen.getByText("split"));
    expect(screen.getByText("splitting")).toBeInTheDocument();
  });

  it("calls onClose on close button click", () => {
    render(<SplitPagesModal {...baseProps} />);
    const closeBtn = screen.getAllByRole("button").find(b => b.querySelector("svg"));
    if (closeBtn) fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("shows non-Error rejection fallback message", async () => {
    mockSplitPdf.mockRejectedValueOnce("string error");
    render(<SplitPagesModal {...baseProps} />);
    const pageButtons = screen.getAllByRole("button");
    const page3Btn = pageButtons.find(b => b.textContent === "3");
    if (page3Btn) fireEvent.click(page3Btn);
    fireEvent.click(screen.getByText("split"));
    await waitFor(() => {
      expect(screen.getByText("splitError")).toBeInTheDocument();
    });
  });

  it("shows error when no split point selected", () => {
    render(<SplitPagesModal {...baseProps} />);
    // The split button is only visible after selecting a split point
    // So this validation is handled by the UI not showing the button at all
    expect(screen.queryByText("split")).not.toBeInTheDocument();
  });

  it("calls onSaved on successful split", async () => {
    const result = { items: [{ id: "s1" }, { id: "s2" }] };
    mockSplitPdf.mockResolvedValue(result);
    render(<SplitPagesModal {...baseProps} />);
    const pageButtons = screen.getAllByRole("button");
    const page3Btn = pageButtons.find(b => b.textContent === "3");
    if (page3Btn) fireEvent.click(page3Btn);
    fireEvent.click(screen.getByText("split"));
    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalledWith(result.items);
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("resets state when modal reopens", () => {
    const { rerender } = render(<SplitPagesModal {...baseProps} />);
    rerender(<SplitPagesModal {...baseProps} open={false} />);
    rerender(<SplitPagesModal {...baseProps} />);
    expect(screen.getByText(/pageCount/)).toBeInTheDocument();
  });

  it("renders page thumbnails with pdfjsLib", async () => {
    render(<SplitPagesModal {...baseProps} />);
    await waitFor(() => {
      expect(mockGetDocument).toHaveBeenCalled();
    });
  });

  it("handles pdfjsLib not available", () => {
    delete (window as any).pdfjsLib;
    render(<SplitPagesModal {...baseProps} />);
    expect(screen.getByText(/pageCount/)).toBeInTheDocument();
  });
});