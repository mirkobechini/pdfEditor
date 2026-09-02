import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MetadataModal from "../MetadataModal";

const mockOnClose = vi.fn();
const mockOnSaved = vi.fn();
const mockGetMetadata = vi.fn();
const mockUpdateMetadata = vi.fn();

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
      expect(screen.getByText(/overwrite/)).toBeInTheDocument();
    });
  });

  it("calls onClose when Cancel clicked", async () => {
    render(<MetadataModal {...baseProps} />);
    await waitFor(() => {
      fireEvent.click(screen.getByText("cancel"));
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("calls updateMetadata on Save", async () => {
    render(<MetadataModal {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Doc Title")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("save"));
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
    fireEvent.click(screen.getByText("save"));
    await waitFor(() => {
      expect(screen.getByText("Update failed")).toBeInTheDocument();
    });
  });

  it("does not render when open is false", () => {
    const { container } = render(<MetadataModal {...baseProps} open={false} />);
    expect(container.innerHTML).toBe("");
  });

  it("shows loading spinner initially", () => {
    mockGetMetadata.mockImplementationOnce(() => new Promise(() => { }));
    render(<MetadataModal {...baseProps} />);
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows error on getMetadata failure", async () => {
    mockGetMetadata.mockRejectedValueOnce(new Error("Load failed"));
    render(<MetadataModal {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByText("Load failed")).toBeInTheDocument();
    });
  });

  it("shows fallback error on getMetadata non-Error rejection", async () => {
    mockGetMetadata.mockRejectedValueOnce("string error");
    render(<MetadataModal {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByText("loadError")).toBeInTheDocument();
    });
  });

  it("toggles overwrite checkbox", async () => {
    render(<MetadataModal {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Doc Title")).toBeInTheDocument();
    });
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("changes filename input", async () => {
    render(<MetadataModal {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("test.pdf")).toBeInTheDocument();
    });
    const input = screen.getByDisplayValue("test.pdf");
    fireEvent.change(input, { target: { value: "renamed.pdf" } });
    expect(screen.getByDisplayValue("renamed.pdf")).toBeInTheDocument();
  });

  it("saves with new filename when changed", async () => {
    render(<MetadataModal {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("test.pdf")).toBeInTheDocument();
    });
    const input = screen.getByDisplayValue("test.pdf");
    fireEvent.change(input, { target: { value: "renamed.pdf" } });
    fireEvent.click(screen.getByText("save"));
    await waitFor(() => {
      expect(mockUpdateMetadata).toHaveBeenCalledWith("p1", {
        title: "Doc Title",
        author: "Author",
        subject: "Subject",
        keywords: "kw",
        new_filename: "renamed.pdf",
        overwrite: false,
      });
    });
  });

  it("saves with overwrite flag", async () => {
    render(<MetadataModal {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Doc Title")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("save"));
    await waitFor(() => {
      expect(mockUpdateMetadata).toHaveBeenCalledWith("p1", {
        title: "Doc Title",
        author: "Author",
        subject: "Subject",
        keywords: "kw",
        new_filename: undefined,
        overwrite: true,
      });
    });
  });

  it("calls onSaved and onClose on successful save", async () => {
    const updatedDoc = { id: "p1", original_filename: "updated.pdf" };
    mockUpdateMetadata.mockResolvedValueOnce(updatedDoc);
    render(<MetadataModal {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Doc Title")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("save"));
    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalledWith(updatedDoc);
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("shows fallback error on save non-Error rejection", async () => {
    mockUpdateMetadata.mockRejectedValueOnce("string error");
    render(<MetadataModal {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Doc Title")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("save"));
    await waitFor(() => {
      expect(screen.getByText("saveError")).toBeInTheDocument();
    });
  });

  it("disables save button while saving", async () => {
    mockUpdateMetadata.mockImplementationOnce(() => new Promise(() => { }));
    render(<MetadataModal {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Doc Title")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("save"));
    expect(screen.getByText("saving")).toBeInTheDocument();
  });

  it("closes via X button", async () => {
    render(<MetadataModal {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Doc Title")).toBeInTheDocument();
    });
    const closeBtn = document.querySelector("svg path");
    if (closeBtn) fireEvent.click(closeBtn.closest("button")!);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("resets state when modal reopens", async () => {
    const { rerender } = render(<MetadataModal {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Doc Title")).toBeInTheDocument();
    });
    // Close and reopen
    rerender(<MetadataModal {...baseProps} open={false} />);
    expect(mockGetMetadata).toHaveBeenCalledTimes(1);
    rerender(<MetadataModal {...baseProps} />);
    await waitFor(() => {
      expect(mockGetMetadata).toHaveBeenCalledTimes(2);
    });
  });

  it("edits metadata fields", async () => {
    render(<MetadataModal {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Doc Title")).toBeInTheDocument();
    });
    const titleInput = screen.getByDisplayValue("Doc Title");
    fireEvent.change(titleInput, { target: { value: "New Title" } });
    expect(screen.getByDisplayValue("New Title")).toBeInTheDocument();
  });

  it("edits author field", async () => {
    render(<MetadataModal {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Author")).toBeInTheDocument();
    });
    const input = screen.getByDisplayValue("Author");
    fireEvent.change(input, { target: { value: "New Author" } });
    expect(screen.getByDisplayValue("New Author")).toBeInTheDocument();
  });

  it("clears author field to null", async () => {
    render(<MetadataModal {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Author")).toBeInTheDocument();
    });
    const input = screen.getByDisplayValue("Author");
    fireEvent.change(input, { target: { value: "" } });
    expect(screen.getByPlaceholderText("authorPlaceholder")).toBeInTheDocument();
  });

  it("edits subject field", async () => {
    render(<MetadataModal {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Subject")).toBeInTheDocument();
    });
    const input = screen.getByDisplayValue("Subject");
    fireEvent.change(input, { target: { value: "New Subject" } });
    expect(screen.getByDisplayValue("New Subject")).toBeInTheDocument();
  });

  it("edits keywords field", async () => {
    render(<MetadataModal {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("kw")).toBeInTheDocument();
    });
    const input = screen.getByDisplayValue("kw");
    fireEvent.change(input, { target: { value: "new,kw" } });
    expect(screen.getByDisplayValue("new,kw")).toBeInTheDocument();
  });
});
