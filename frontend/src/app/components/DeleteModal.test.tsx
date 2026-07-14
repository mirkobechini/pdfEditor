import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import DeleteModal from "./DeleteModal";
import { api } from "../lib/api";

// Mock api
vi.mock("../lib/api", () => ({
  api: {
    downloadPdf: vi.fn(),
    deletePdf: vi.fn(),
  },
}));

// Mock pdfPreview
vi.mock("../lib/pdfPreview", () => ({
  renderFirstPageToDataUrl: vi.fn(),
}));

const mockFile = {
  id: "1",
  original_filename: "test.pdf",
  file_size: 100,
  page_count: 5,
  created_at: "",
  updated_at: "",
};

describe("DeleteModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when open is false", () => {
    render(<DeleteModal open={false} onClose={() => { }} file={null} onConfirm={() => { }} />);
    expect(screen.queryByText("title")).not.toBeInTheDocument();
  });

  it("renders modal with file info when open is true", () => {
    render(
      <DeleteModal open={true} onClose={() => { }} file={mockFile} onConfirm={() => { }} />
    );

    expect(screen.getByText("title")).toBeInTheDocument();
    // The confirm message is split by <strong> element, so use a regex
    expect(screen.getByText(/confirmMessage/)).toBeInTheDocument();
    expect(screen.getByText("test.pdf")).toBeInTheDocument();
    expect(screen.getByText("pageCount")).toBeInTheDocument();
  });

  it("shows loading skeleton while loading preview", async () => {
    (api.downloadPdf as any).mockImplementation(() => new Promise(() => { })); // Never resolves

    render(
      <DeleteModal open={true} onClose={() => { }} file={mockFile} onConfirm={() => { }} />
    );

    expect(screen.getByText("preview")).toBeInTheDocument();
    // PdfThumbnail renders an animate-pulse div while loading
    const skeleton = document.querySelector(".animate-pulse");
    expect(skeleton).toBeInTheDocument();
  });

  it("shows preview image when loaded", async () => {
    const mockBlob = new Blob(["test"], { type: "application/pdf" });
    (api.downloadPdf as any).mockResolvedValue(mockBlob);
    const { renderFirstPageToDataUrl } = await import("../lib/pdfPreview");
    (renderFirstPageToDataUrl as any).mockResolvedValue("data:image/png;base64,test");

    render(
      <DeleteModal open={true} onClose={() => { }} file={mockFile} onConfirm={() => { }} />
    );

    await waitFor(() => {
      const img = screen.getByAltText("Preview of test.pdf");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "data:image/png;base64,test");
    });
  });

  it("shows fallback when preview fails", async () => {
    (api.downloadPdf as any).mockRejectedValue(new Error("Failed"));

    render(
      <DeleteModal open={true} onClose={() => { }} file={mockFile} onConfirm={() => { }} />
    );

    await waitFor(() => {
      expect(screen.getByText("Preview unavailable")).toBeInTheDocument();
    });
  });

  it("calls onConfirm when confirm button is clicked", async () => {
    const mockBlob = new Blob(["test"], { type: "application/pdf" });
    (api.downloadPdf as any).mockResolvedValue(mockBlob);
    const { renderFirstPageToDataUrl } = await import("../lib/pdfPreview");
    (renderFirstPageToDataUrl as any).mockResolvedValue("data:image/png;base64,test");

    const onConfirm = vi.fn();
    render(
      <DeleteModal open={true} onClose={() => { }} file={mockFile} onConfirm={onConfirm} />
    );

    await waitFor(() => {
      expect(screen.getByText("confirm")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("confirm"));
    });

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled();
    });
  });

  it("calls onClose when cancel button is clicked", async () => {
    const mockBlob = new Blob(["test"], { type: "application/pdf" });
    (api.downloadPdf as any).mockResolvedValue(mockBlob);
    const { renderFirstPageToDataUrl } = await import("../lib/pdfPreview");
    (renderFirstPageToDataUrl as any).mockResolvedValue("data:image/png;base64,test");

    const onClose = vi.fn();
    render(
      <DeleteModal open={true} onClose={onClose} file={mockFile} onConfirm={() => { }} />
    );

    await waitFor(() => {
      expect(screen.getByText("cancel")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("cancel"));
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop is clicked", async () => {
    const mockBlob = new Blob(["test"], { type: "application/pdf" });
    (api.downloadPdf as any).mockResolvedValue(mockBlob);
    const { renderFirstPageToDataUrl } = await import("../lib/pdfPreview");
    (renderFirstPageToDataUrl as any).mockResolvedValue("data:image/png;base64,test");

    const onClose = vi.fn();
    render(
      <DeleteModal open={true} onClose={onClose} file={mockFile} onConfirm={() => { }} />
    );

    await waitFor(() => {
      expect(screen.getByText("cancel")).toBeInTheDocument();
    });

    // Click on the backdrop (the outer div with onClick handler)
    const backdrop = screen.getByRole("dialog");
    await act(async () => {
      fireEvent.click(backdrop);
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("shows deleting state while deleting", async () => {
    const mockBlob = new Blob(["test"], { type: "application/pdf" });
    (api.downloadPdf as any).mockResolvedValue(mockBlob);
    const { renderFirstPageToDataUrl } = await import("../lib/pdfPreview");
    (renderFirstPageToDataUrl as any).mockResolvedValue("data:image/png;base64,test");

    // onConfirm never resolves to keep deleting state visible
    const onConfirm = vi.fn().mockImplementation(() => new Promise(() => { }));

    render(
      <DeleteModal open={true} onClose={() => { }} file={mockFile} onConfirm={onConfirm} />
    );

    await waitFor(() => {
      expect(screen.getByText("confirm")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("confirm"));
    });

    await waitFor(() => {
      expect(screen.getByText("deleting")).toBeInTheDocument();
    });
  });

  it("shows warning message", async () => {
    const mockBlob = new Blob(["test"], { type: "application/pdf" });
    (api.downloadPdf as any).mockResolvedValue(mockBlob);
    const { renderFirstPageToDataUrl } = await import("../lib/pdfPreview");
    (renderFirstPageToDataUrl as any).mockResolvedValue("data:image/png;base64,test");

    render(
      <DeleteModal open={true} onClose={() => { }} file={mockFile} onConfirm={() => { }} />
    );

    await waitFor(() => {
      expect(screen.getByText("warning")).toBeInTheDocument();
    });
  });
});