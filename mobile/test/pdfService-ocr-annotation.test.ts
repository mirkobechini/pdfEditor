/**
 * Tests for pdfService's ocrPdf and addAnnotation operations.
 * Both follow the same upload → mutate on backend → download → save locally
 * pattern as compressPdf (see test/pdfService-compress.test.ts).
 */
const mockFileInstance = {
  arrayBuffer: jest.fn(),
  exists: true,
  size: 1024,
  uri: "file:///pdfs/test.pdf",
  delete: jest.fn(),
};

const mockDirInstance = {
  exists: true,
  create: jest.fn(),
  uri: "file:///pdfs/",
};

jest.mock("expo-file-system", () => ({
  File: jest.fn().mockImplementation(() => mockFileInstance),
  Directory: jest.fn().mockImplementation(() => mockDirInstance),
  Paths: { document: "file:///documents" },
}));

jest.mock("expo-file-system/legacy", () => ({
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  EncodingType: { Base64: "base64" },
}));

const mockGetLocalPdfById = jest.fn();
const mockSavePdfLocally = jest.fn();
jest.mock("../src/services/localDb", () => ({
  getLocalPdfById: (...args: unknown[]) => mockGetLocalPdfById(...args),
  savePdfLocally: (...args: unknown[]) => mockSavePdfLocally(...args),
}));

const mockUploadPdf = jest.fn();
const mockOcrPdf = jest.fn();
const mockAddAnnotation = jest.fn();
const mockDownloadPdf = jest.fn();
jest.mock("../src/shared/api", () => ({
  api: {
    uploadPdf: (...args: unknown[]) => mockUploadPdf(...args),
    ocrPdf: (...args: unknown[]) => mockOcrPdf(...args),
    addAnnotation: (...args: unknown[]) => mockAddAnnotation(...args),
    downloadPdf: (...args: unknown[]) => mockDownloadPdf(...args),
  },
}));

import { ocrPdf, addAnnotation } from "../src/services/pdfService";
import type { LocalPdf } from "../src/shared/types";

const samplePdf: LocalPdf = {
  id: "pdf-1",
  original_filename: "test.pdf",
  file_size: 1024,
  page_count: 1,
  uri: "file:///pdfs/pdf-1.pdf",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetLocalPdfById.mockResolvedValue(samplePdf);
  mockUploadPdf.mockResolvedValue({ id: "cloud-1", original_filename: "test.pdf" });
  mockDownloadPdf.mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);
  mockSavePdfLocally.mockResolvedValue(undefined);
});

describe("ocrPdf", () => {
  it("uploads, runs OCR, downloads and saves locally", async () => {
    mockOcrPdf.mockResolvedValue({
      pdf: { id: "cloud-1", page_count: 1 },
      character_count: 42,
      already_searchable: false,
    });

    const result = await ocrPdf("pdf-1", "eng");

    expect(mockUploadPdf).toHaveBeenCalled();
    expect(mockOcrPdf).toHaveBeenCalledWith("cloud-1", "eng");
    expect(mockDownloadPdf).toHaveBeenCalledWith("cloud-1");
    expect(mockSavePdfLocally).toHaveBeenCalled();
    expect(result).toEqual({
      pdf: expect.objectContaining({ original_filename: "test.pdf" }),
      characterCount: 42,
      alreadySearchable: false,
    });
  });

  it("still saves a local copy when the PDF was already searchable", async () => {
    mockOcrPdf.mockResolvedValue({
      pdf: { id: "cloud-1", page_count: 1 },
      character_count: 0,
      already_searchable: true,
    });

    const result = await ocrPdf("pdf-1");

    expect(result?.alreadySearchable).toBe(true);
    expect(mockSavePdfLocally).toHaveBeenCalled();
  });

  it("returns null when the local PDF is not found", async () => {
    mockGetLocalPdfById.mockResolvedValue(null);
    const result = await ocrPdf("pdf-1");
    expect(result).toBeNull();
    expect(mockUploadPdf).not.toHaveBeenCalled();
  });

  it("returns null when the backend OCR call fails", async () => {
    mockOcrPdf.mockRejectedValue(new Error("ocr failed"));
    const result = await ocrPdf("pdf-1");
    expect(result).toBeNull();
    expect(mockSavePdfLocally).not.toHaveBeenCalled();
  });
});

describe("addAnnotation", () => {
  const annotationReq = { page: 1, type: "highlight", rect: [0, 0, 100, 50], color: "#FFFF00" };

  it("uploads, annotates, downloads and saves locally", async () => {
    mockAddAnnotation.mockResolvedValue({ id: "cloud-1", page_count: 1 });

    const result = await addAnnotation("pdf-1", annotationReq);

    expect(mockUploadPdf).toHaveBeenCalled();
    expect(mockAddAnnotation).toHaveBeenCalledWith("cloud-1", annotationReq);
    expect(mockDownloadPdf).toHaveBeenCalledWith("cloud-1");
    expect(mockSavePdfLocally).toHaveBeenCalled();
    expect(result?.original_filename).toBe("test.pdf");
  });

  it("returns null when the local PDF is not found", async () => {
    mockGetLocalPdfById.mockResolvedValue(null);
    const result = await addAnnotation("pdf-1", annotationReq);
    expect(result).toBeNull();
    expect(mockUploadPdf).not.toHaveBeenCalled();
  });

  it("returns null when the backend annotation call fails", async () => {
    mockAddAnnotation.mockRejectedValue(new Error("annotation failed"));
    const result = await addAnnotation("pdf-1", annotationReq);
    expect(result).toBeNull();
    expect(mockSavePdfLocally).not.toHaveBeenCalled();
  });
});
