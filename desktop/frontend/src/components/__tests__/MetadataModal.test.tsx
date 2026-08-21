import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MetadataModal from "../MetadataModal";

const mockOnClose = vi.fn();
const mockOnSaved = vi.fn();
const mockGetMetadata = vi.fn();
const mockUpdateMetadata = vi.fn();

const baseProps = {
  open: true,
  pdfId: "p1",
  pdfName: "test.pdf",
  onClose: mockOnClose,
  onSaved: mockOnSaved,
};

vi.mock("../../shared/api", () => ({
  api: {
    getMetadata: (...args: any[]) => mockGetMetadata(...args),
    updateMetadata: (...args: any[]) => mockUpdateMetadata(...args),
  },
}));

describe("MetadataModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMetadata.mockResolvedValue({ title: "Doc Title", author: "Author", subject: "Subject", keywords: "kw" });
    mockUpdateMetadata.mockResolvedValue({ id: "p1", original_filename: "test.pdf" });
  });

  it("renders metadata fields after loading", async () => {
    render(<MetadataModal {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Doc Title")).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue("Author")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Subject")).toBeInTheDocument();
    expect(screen.getByDisplayValue("kw")).toBeInTheDocument();
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

  it("calls updateMetadata on Save", async () => {
    render(<MetadataModal {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Doc Title")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => {
      expect(mockUpdateMetadata).toHaveBeenCalled();
    });
  });

  it("shows error on updateMetadata failure", async () => {
    mockUpdateMetadata.mockRejectedValueOnce(new Error("Update failed"));
    render(<MetadataModal {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Doc Title")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => {
      expect(screen.getByText("Update failed")).toBeInTheDocument();
    });
  });

  it("does not render when open is false", () => {
    const { container } = render(<MetadataModal {...baseProps} open={false} />);
    expect(container.innerHTML).toBe("");
  });
});
