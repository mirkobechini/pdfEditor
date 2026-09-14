import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CompressModal from "../CompressModal";

const mockOnClose = vi.fn();
const mockOnSaved = vi.fn();
const mockCompressPdf = vi.fn();

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
    compressPdf: (...args: any[]) => mockCompressPdf(...args),
  },
}));

vi.mock("../../hooks/useApiError", () => ({
  useApiError: () => ({ apiError: (err: unknown) => (err instanceof Error ? err.message : String(err)) }),
}));

describe("CompressModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompressPdf.mockResolvedValue({ id: "compressed", original_filename: "compressed_test.pdf" });
  });

  it("renders when open", () => {
    render(<CompressModal {...baseProps} />);
    expect(screen.getByText("title")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    const { container } = render(<CompressModal {...baseProps} open={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("defaults output name to compressed_<name>", () => {
    render(<CompressModal {...baseProps} />);
    expect(screen.getByDisplayValue("compressed_test.pdf")).toBeInTheDocument();
  });

  it("calls compressPdf with default quality and no overwrite", async () => {
    render(<CompressModal {...baseProps} />);
    fireEvent.click(screen.getByText("confirm"));
    await waitFor(() => {
      expect(mockCompressPdf).toHaveBeenCalledWith("p1", "medium", "compressed_test.pdf", false);
    });
    expect(mockOnSaved).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("calls compressPdf with selected quality and overwrite", async () => {
    render(<CompressModal {...baseProps} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "high" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByDisplayValue("compressed_test.pdf"), { target: { value: "my.pdf" } });
    fireEvent.click(screen.getByText("confirm"));
    await waitFor(() => {
      expect(mockCompressPdf).toHaveBeenCalledWith("p1", "high", "my.pdf", true);
    });
  });

  it("shows error when compressPdf fails", async () => {
    mockCompressPdf.mockRejectedValue(new Error("Compression failed"));
    render(<CompressModal {...baseProps} />);
    fireEvent.click(screen.getByText("confirm"));
    await waitFor(() => {
      expect(screen.getByText(/Compression failed/)).toBeInTheDocument();
    });
  });
});