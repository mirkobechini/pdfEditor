import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderFirstPageToDataUrl } from "../lib/pdfPreview";

// Mock canvas context
const mockDrawImage = vi.fn();
const mockScale = vi.fn();
const mockGetContext = vi.fn(() => ({
  scale: mockScale,
  drawImage: mockDrawImage,
}));

// Mock PDF.js page
function createMockPage(scale: number = 0.5) {
  return {
    getViewport: vi.fn(() => ({
      width: 612 * scale,
      height: 792 * scale,
    })),
    render: vi.fn(() => ({
      promise: Promise.resolve(),
    })),
  };
}

// Mock PDF.js document
function createMockPdfDocument() {
  return {
    getPage: vi.fn(() => Promise.resolve(createMockPage())),
    numPages: 1,
  };
}

// Mock PDF.js library
function createMockPdfjsLib() {
  return {
    getDocument: vi.fn(() => ({
      promise: Promise.resolve(createMockPdfDocument()),
    })),
    GlobalWorkerOptions: {
      workerSrc: "",
    },
  };
}

describe("renderFirstPageToDataUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock document.createElement for canvas
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(
      (tagName, options) => {
        if (tagName === "canvas") {
          const canvas = originalCreateElement(tagName, options);
          Object.defineProperty(canvas, "getContext", {
            value: mockGetContext,
            writable: true,
          });
          return canvas;
        }
        return originalCreateElement(tagName, options);
      },
    );

    // Mock canvas.toDataURL
    HTMLCanvasElement.prototype.toDataURL = vi.fn(
      () => "data:image/png;base64,mockdata",
    );

    // Mock window.devicePixelRatio
    Object.defineProperty(window, "devicePixelRatio", {
      value: 1,
      writable: true,
      configurable: true,
    });
  });

  it("renders first page to data URL successfully", async () => {
    const mockPdfjsLib = createMockPdfjsLib();
    (window as any).pdfjsLib = mockPdfjsLib;

    const result = await renderFirstPageToDataUrl(
      "http://example.com/test.pdf",
    );

    expect(mockPdfjsLib.getDocument).toHaveBeenCalledWith(
      "http://example.com/test.pdf",
    );
    expect(result).toBe("data:image/png;base64,mockdata");
  });

  it("loads PDF.js if not already loaded", async () => {
    // Remove pdfjsLib from window
    delete (window as any).pdfjsLib;

    // Mock script loading
    const mockScript = document.createElement("script");
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(
      (tagName, options) => {
        if (tagName === "script") {
          // Simulate script load
          setTimeout(() => {
            (window as any).pdfjsLib = createMockPdfjsLib();
            if (mockScript.onload) {
              mockScript.onload(new Event("load"));
            }
          }, 10);
          return mockScript;
        }
        if (tagName === "canvas") {
          const canvas = originalCreateElement(tagName, options);
          Object.defineProperty(canvas, "getContext", {
            value: mockGetContext,
            writable: true,
          });
          return canvas;
        }
        return originalCreateElement(tagName, options);
      },
    );

    // Mock appendChild
    vi.spyOn(document.body, "appendChild").mockImplementation((el) => el);

    const result = await renderFirstPageToDataUrl(
      "http://example.com/test.pdf",
    );

    expect(result).toBe("data:image/png;base64,mockdata");
    expect(document.body.appendChild).toHaveBeenCalled();
  });

  it("throws error when PDF.js fails to load", async () => {
    delete (window as any).pdfjsLib;

    const mockScript = document.createElement("script");
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "script") {
        setTimeout(() => {
          if (mockScript.onerror) {
            mockScript.onerror(new Event("error"));
          }
        }, 10);
        return mockScript;
      }
      return document.createElement(tagName);
    });

    vi.spyOn(document.body, "appendChild").mockImplementation((el) => el);

    await expect(
      renderFirstPageToDataUrl("http://example.com/test.pdf"),
    ).rejects.toThrow("Failed to load PDF.js");
  });

  it("throws error when PDF document fails to load", async () => {
    const mockPdfjsLib = {
      getDocument: vi.fn(() => ({
        promise: Promise.reject(new Error("Invalid PDF")),
      })),
      GlobalWorkerOptions: { workerSrc: "" },
    };
    (window as any).pdfjsLib = mockPdfjsLib;

    await expect(
      renderFirstPageToDataUrl("http://example.com/bad.pdf"),
    ).rejects.toThrow("Invalid PDF");
  });

  it("throws error when page rendering fails", async () => {
    const mockPage = {
      getViewport: vi.fn(() => ({ width: 612, height: 792 })),
      render: vi.fn(() => ({
        promise: Promise.reject(new Error("Render failed")),
      })),
    };

    const mockPdfjsLib = {
      getDocument: vi.fn(() => ({
        promise: Promise.resolve({
          getPage: vi.fn(() => Promise.resolve(mockPage)),
          numPages: 1,
        }),
      })),
      GlobalWorkerOptions: { workerSrc: "" },
    };
    (window as any).pdfjsLib = mockPdfjsLib;

    await expect(
      renderFirstPageToDataUrl("http://example.com/test.pdf"),
    ).rejects.toThrow("Render failed");
  });

  it("uses devicePixelRatio for HiDPI rendering", async () => {
    Object.defineProperty(window, "devicePixelRatio", {
      value: 2,
      writable: true,
      configurable: true,
    });

    const mockPdfjsLib = createMockPdfjsLib();
    (window as any).pdfjsLib = mockPdfjsLib;

    await renderFirstPageToDataUrl("http://example.com/test.pdf");

    // Should scale canvas by DPR
    expect(mockScale).toHaveBeenCalledWith(2, 2);
  });

  it("handles missing devicePixelRatio gracefully", async () => {
    Object.defineProperty(window, "devicePixelRatio", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const mockPdfjsLib = createMockPdfjsLib();
    (window as any).pdfjsLib = mockPdfjsLib;

    await renderFirstPageToDataUrl("http://example.com/test.pdf");

    // Should default to 1
    expect(mockScale).toHaveBeenCalledWith(1, 1);
  });
});
