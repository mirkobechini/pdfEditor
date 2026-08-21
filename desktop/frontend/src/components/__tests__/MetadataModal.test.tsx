import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MetadataModal from "../MetadataModal";

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
    getMetadata: vi.fn().mockResolvedValue({ title: "Doc Title", author: "Author" }),
    updateMetadata: vi.fn().mockResolvedValue({ id: "p1", original_filename: "test.pdf" }),
  },
}));

describe("MetadataModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders metadata fields after loading", async () => {
    render(<MetadataModal {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Doc Title")).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue("Author")).toBeInTheDocument();
  });

  it("shows filename input", async () => {
    render(<MetadataModal {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("test.pdf")).toBeInTheDocument();
    });
  });

  it("shows overwrite checkbox", async () => {
    render(<MetadataModal {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Overwrite/)).toBeInTheDocument();
    });
  });

  it("calls onClose when Cancel clicked", async () => {
    render(<MetadataModal {...baseProps} />);
    await waitFor(() => {
      fireEvent.click(screen.getByText("Cancel"));
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("does not render when open is false", () => {
    const { container } = render(<MetadataModal {...baseProps} open={false} />);
    expect(container.innerHTML).toBe("");
  });
});
