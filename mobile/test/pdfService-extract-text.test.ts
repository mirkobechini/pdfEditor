/**
 * Tests for pdfService's extractText operation (issue-1069/B12).
 * Unlike ocrPdf/addAnnotation this doesn't transform the PDF, so there's
 * no download/save step: just upload and return the extracted text.
 */
const mockGetLocalPdfById = jest.fn();
jest.mock("../src/services/localDb", () => ({
  getLocalPdfById: (...args: unknown[]) => mockGetLocalPdfById(...args),
}));

const mockUploadPdf = jest.fn();
const mockExtractText = jest.fn();
jest.mock("../src/shared/api", () => ({
  api: {
    uploadPdf: (...args: unknown[]) => mockUploadPdf(...args),
    extractText: (...args: unknown[]) => mockExtractText(...args),
  },
}));

import { extractText } from "../src/services/pdfService";
import type { LocalPdf } from "../src/shared/types";

const samplePdf: LocalPdf = {
  id: "pdf-1",
  original_filename: "test.pdf",
  file_size: 1024,
  page_count: 2,
  uri: "file:///pdfs/pdf-1.pdf",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetLocalPdfById.mockResolvedValue(samplePdf);
  mockUploadPdf.mockResolvedValue({ id: "cloud-1", original_filename: "test.pdf" });
});

describe("extractText", () => {
  it("uploads and returns the extracted text for all pages", async () => {
    mockExtractText.mockResolvedValue({ text: "ciao mondo", pages: 2 });

    const result = await extractText("pdf-1");

    expect(mockUploadPdf).toHaveBeenCalled();
    expect(mockExtractText).toHaveBeenCalledWith("cloud-1", undefined);
    expect(result).toEqual({ text: "ciao mondo", pages: 2 });
  });

  it("passes through the page number when given", async () => {
    mockExtractText.mockResolvedValue({ text: "pagina 2", pages: 2 });

    await extractText("pdf-1", 2);

    expect(mockExtractText).toHaveBeenCalledWith("cloud-1", 2);
  });

  it("returns null when the local PDF is not found", async () => {
    mockGetLocalPdfById.mockResolvedValue(null);
    const result = await extractText("pdf-1");
    expect(result).toBeNull();
    expect(mockUploadPdf).not.toHaveBeenCalled();
  });

  it("returns null when the backend call fails", async () => {
    mockExtractText.mockRejectedValue(new Error("network"));
    const result = await extractText("pdf-1");
    expect(result).toBeNull();
  });
});
