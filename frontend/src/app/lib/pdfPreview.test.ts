import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderFirstPageToDataUrl } from "../lib/pdfPreview";

// Keep a reference to the original createElement to avoid recursion in mocks
const originalCreateElement = document.createElement.bind(document);

// Helper: wrap a real canvas with mock methods
function wrapCanvas(canvas: HTMLCanvasElement) {
  vi.spyOn(canvas, "getContext").mockReturnValue({
    scale: vi.fn(),
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(canvas, "toDataURL").mockReturnValue("data:image/png;base64,mockdata");
  return canvas;
}

function createMockPdfDocument(pageOptions?: { renderError?: string }) {
  const renderResult = pageOptions?.renderError
    ? { promise: Promise.reject(new Error(pageOptions.renderError)) }
    : { promise: Promise.resolve() };

  return {
    getPage: vi.fn(() =>
      Promise.resolve({
        getViewport: vi.fn(() => ({ width: 612, height: 792 })),
        render: vi.fn(() => renderResult),
      })
    ),
    numPages: 1,
  };
}

describe("renderFirstPageToDataUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: pdfjsLib already loaded
    (window as any).pdfjsLib = {
      getDocument: vi.fn(() => ({
        promise: Promise.resolve(createMockPdfDocument()),
      })),
      GlobalWorkerOptions: { workerSrc: "" },
    };
    Object.defineProperty(window, "devicePixelRatio", {
      value: 1,
      writable: true,
      configurable: true,
    });
  });

  it("renders first page to data URL successfully", async () => {
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      const el = originalCreateElement(tagName);
      if (tagName === "canvas") return wrapCanvas(el as HTMLCanvasElement);
      return el;
    });

    const result = await renderFirstPageToDataUrl("http://example.com/test.pdf");

    expect((window as any).pdfjsLib.getDocument).toHaveBeenCalledWith(
      "http://example.com/test.pdf"
    );
    expect(result).toBe("data:image/png;base64,mockdata");
  });

  it("loads PDF.js dynamically if pdfjsLib is not on window", async () => {
    delete (window as any).pdfjsLib;

    const mockScript = originalCreateElement("script");
    let onloadCb: (() => void) | null = null;
    Object.defineProperty(mockScript, "onload", {
      set(fn) { onloadCb = fn; },
      get() { return onloadCb; },
      configurable: true,
    });

    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "script") return mockScript;
      if (tagName === "canvas") return wrapCanvas(originalCreateElement(tagName) as HTMLCanvasElement);
      return originalCreateElement(tagName);
    });

    vi.spyOn(document.body, "appendChild").mockImplementation((el) => {
      setTimeout(() => {
        (window as any).pdfjsLib = {
          getDocument: vi.fn(() => ({
            promise: Promise.resolve(createMockPdfDocument()),
          })),
          GlobalWorkerOptions: { workerSrc: "" },
        };
        if (onloadCb) onloadCb();
      }, 5);
      return el;
    });

    const result = await renderFirstPageToDataUrl("http://example.com/test.pdf");

    expect(result).toBe("data:image/png;base64,mockdata");
    expect(document.body.appendChild).toHaveBeenCalledWith(mockScript);
  });

  it("throws error when PDF.js fails to load", async () => {
    delete (window as any).pdfjsLib;

    const mockScript = originalCreateElement("script");
    let onerrorCb: ((ev: Event) => void) | null = null;
    Object.defineProperty(mockScript, "onerror", {
      set(fn) { onerrorCb = fn; },
      get() { return onerrorCb; },
      configurable: true,
    });

    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "script") return mockScript;
      if (tagName === "canvas") return wrapCanvas(originalCreateElement(tagName) as HTMLCanvasElement);
      return originalCreateElement(tagName);
    });

    vi.spyOn(document.body, "appendChild").mockImplementation(() => {
      setTimeout(() => { if (onerrorCb) onerrorCb(new Event("error")); }, 5);
      return mockScript;
    });

    await expect(
      renderFirstPageToDataUrl("http://example.com/test.pdf")
    ).rejects.toThrow("Failed to load PDF.js");
  });

  it("throws error when PDF document fails to load", async () => {
    (window as any).pdfjsLib = {
      getDocument: vi.fn(() => ({
        promise: Promise.reject(new Error("Invalid PDF")),
      })),
      GlobalWorkerOptions: { workerSrc: "" },
    };

    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "canvas") return wrapCanvas(originalCreateElement(tagName) as HTMLCanvasElement);
      return originalCreateElement(tagName);
    });

    await expect(
      renderFirstPageToDataUrl("http://example.com/bad.pdf")
    ).rejects.toThrow("Invalid PDF");
  });

  it("throws error when page rendering fails", async () => {
    (window as any).pdfjsLib = {
      getDocument: vi.fn(() => ({
        promise: Promise.resolve(createMockPdfDocument({ renderError: "Render failed" })),
      })),
      GlobalWorkerOptions: { workerSrc: "" },
    };

    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "canvas") return wrapCanvas(originalCreateElement(tagName) as HTMLCanvasElement);
      return originalCreateElement(tagName);
    });

    await expect(
      renderFirstPageToDataUrl("http://example.com/test.pdf")
    ).rejects.toThrow("Render failed");
  });

  it("uses devicePixelRatio for HiDPI rendering", async () => {
    Object.defineProperty(window, "devicePixelRatio", {
      value: 2,
      writable: true,
      configurable: true,
    });

    const mockCanvas = wrapCanvas(originalCreateElement("canvas") as HTMLCanvasElement);
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "canvas") return mockCanvas;
      return originalCreateElement(tagName);
    });

    await renderFirstPageToDataUrl("http://example.com/test.pdf");

    const ctx = mockCanvas.getContext("2d") as any;
    expect(ctx.scale).toHaveBeenCalledWith(2, 2);
  });

  it("handles missing devicePixelRatio gracefully", async () => {
    Object.defineProperty(window, "devicePixelRatio", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const mockCanvas = wrapCanvas(originalCreateElement("canvas") as HTMLCanvasElement);
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "canvas") return mockCanvas;
      return originalCreateElement(tagName);
    });

    await renderFirstPageToDataUrl("http://example.com/test.pdf");

    const ctx = mockCanvas.getContext("2d") as any;
    expect(ctx.scale).toHaveBeenCalledWith(1, 1);
  });
});