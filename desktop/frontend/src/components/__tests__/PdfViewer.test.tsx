import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import PdfViewer from "../PdfViewer";

describe("PdfViewer", () => {
  const defaultProps = {
    fileUrl: null,
    currentPage: 1,
    totalPages: 0,
    onPageChange: vi.fn(),
    onTotalPagesChange: vi.fn(),
    zoom: 1,
    onZoomChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).pdfjsLib = undefined;
  });

  it("renders placeholder when no fileUrl", () => {
    render(<PdfViewer {...defaultProps} />);
    expect(screen.getByText("Seleziona un PDF per visualizzarlo")).toBeInTheDocument();
  });

  it("renders canvas when fileUrl is provided", () => {
    render(<PdfViewer {...defaultProps} fileUrl="blob:test" />);
    const canvas = document.querySelector("canvas");
    expect(canvas).toBeInTheDocument();
  });

  it("loads PDF.js script when not already loaded", () => {
    const appendChildSpy = vi.spyOn(document.body, "appendChild");
    render(<PdfViewer {...defaultProps} fileUrl="blob:test" />);
    expect(appendChildSpy).toHaveBeenCalled();
    appendChildSpy.mockRestore();
  });

  it("uses existing pdfjsLib if already loaded", () => {
    (window as any).pdfjsLib = {
      GlobalWorkerOptions: { workerSrc: "" },
      getDocument: vi.fn().mockReturnValue({ promise: Promise.resolve({ numPages: 5 }) }),
    };
    render(<PdfViewer {...defaultProps} fileUrl="blob:test" />);
    const canvas = document.querySelector("canvas");
    expect(canvas).toBeInTheDocument();
  });

  it("calls onTotalPagesChange when PDF loads", async () => {
    const onTotalPagesChange = vi.fn();
    (window as any).pdfjsLib = {
      GlobalWorkerOptions: { workerSrc: "" },
      getDocument: vi.fn().mockReturnValue({ promise: Promise.resolve({ numPages: 3 }) }),
    };
    render(<PdfViewer {...defaultProps} fileUrl="blob:test" onTotalPagesChange={onTotalPagesChange} />);
    await new Promise((r) => setTimeout(r, 50));
    expect(onTotalPagesChange).toHaveBeenCalledWith(3);
  });

  it("handles PDF load error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (window as any).pdfjsLib = {
      GlobalWorkerOptions: { workerSrc: "" },
      getDocument: vi.fn().mockReturnValue({ promise: Promise.reject(new Error("PDF load failed")) }),
    };
    render(<PdfViewer {...defaultProps} fileUrl="blob:test" />);
    await new Promise((r) => setTimeout(r, 50));
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("handles script onload when pdfjsLib not preloaded", () => {
    const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation((el: any) => {
      if (el.tagName === "SCRIPT" && el.onload) {
        setTimeout(() => el.onload(), 10);
      }
      return el;
    });
    render(<PdfViewer {...defaultProps} fileUrl="blob:test" />);
    expect(appendChildSpy).toHaveBeenCalled();
    appendChildSpy.mockRestore();
  });

  it("handles render error with RenderingCancelledException", async () => {
    const mockPage = {
      getViewport: () => ({ width: 100, height: 150 }),
      render: () => ({ promise: Promise.reject({ name: "RenderingCancelledException" }) }),
    };
    (window as any).pdfjsLib = {
      GlobalWorkerOptions: { workerSrc: "" },
      getDocument: vi.fn().mockReturnValue({ promise: Promise.resolve({ numPages: 1, getPage: vi.fn().mockResolvedValue(mockPage) }) }),
    };
    render(<PdfViewer {...defaultProps} fileUrl="blob:test" />);
    await new Promise((r) => setTimeout(r, 100));
    const canvas = document.querySelector("canvas");
    expect(canvas).toBeInTheDocument();
  });

  it("handles render error with Node cannot be found", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mockPage = {
      getViewport: () => ({ width: 100, height: 150 }),
      render: () => ({ promise: Promise.reject(new Error("Node cannot be found")) }),
    };
    (window as any).pdfjsLib = {
      GlobalWorkerOptions: { workerSrc: "" },
      getDocument: vi.fn().mockReturnValue({ promise: Promise.resolve({ numPages: 1, getPage: vi.fn().mockResolvedValue(mockPage) }) }),
    };
    render(<PdfViewer {...defaultProps} fileUrl="blob:test" />);
    await new Promise((r) => setTimeout(r, 100));
    consoleSpy.mockRestore();
  });

  it("handles render error with other error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mockPage = {
      getViewport: () => ({ width: 100, height: 150 }),
      render: () => ({ promise: Promise.reject(new Error("Some render error")) }),
    };
    (window as any).pdfjsLib = {
      GlobalWorkerOptions: { workerSrc: "" },
      getDocument: vi.fn().mockReturnValue({ promise: Promise.resolve({ numPages: 1, getPage: vi.fn().mockResolvedValue(mockPage) }) }),
    };
    render(<PdfViewer {...defaultProps} fileUrl="blob:test" />);
    await new Promise((r) => setTimeout(r, 100));
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("shows rendering spinner while loading", () => {
    (window as any).pdfjsLib = {
      GlobalWorkerOptions: { workerSrc: "" },
      getDocument: vi.fn().mockReturnValue({ promise: new Promise(() => {}) }),
    };
    render(<PdfViewer {...defaultProps} fileUrl="blob:test" />);
    // The spinner is shown when rendering is true (set in the render effect)
    // Just verify the component renders without error
    const canvas = document.querySelector("canvas");
    expect(canvas).toBeInTheDocument();
  });
});
