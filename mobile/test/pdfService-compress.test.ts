/**
 * Tests for pdfService compressPdf operation.
 * Flow: upload local PDF → compress on backend → download → save locally.
 */
import { PDFDocument } from "@cantoo/pdf-lib";

// Mock expo-file-system
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

// Mock localDb
const mockGetLocalPdfById = jest.fn();
const mockSavePdfLocally = jest.fn();
jest.mock("../src/services/localDb", () => ({
  getLocalPdfById: (...args: unknown[]) => mockGetLocalPdfById(...args),
  savePdfLocally: (...args: unknown[]) => mockSavePdfLocally(...args),
}));

// Mock shared/api
const mockUploadPdf = jest.fn();
const mockCompressPdf = jest.fn();
const mockDownloadPdf = jest.fn();
jest.mock("../src/shared/api", () => ({
  api: {
    uploadPdf: (...args: unknown[]) => mockUploadPdf(...args),
    compressPdf: (...args: unknown[]) => mockCompressPdf(...args),
    downloadPdf: (...args: unknown[]) => mockDownloadPdf(...args),
  },
}));

import { compressPdf } from "../src/services/pdfService";
import type { LocalPdf } from "../src/shared/types";

async function createTestPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([100, 100]);
  return doc.save();
}

const samplePdf: LocalPdf = {
  id: "pdf-1",
  original_filename: "test.pdf",
  file_size: 1024,
  page_count: 1,
  uri: "file:///pdfs/pdf-1.pdf",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("compressPdf", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLocalPdfById.mockResolvedValue(samplePdf);
    mockUploadPdf.mockResolvedValue({ id: "cloud-1", original_filename: "test.pdf" });
    mockCompressPdf.mockResolvedValue({
      id: "cloud-2",
      original_filename: "compressed_test.pdf",
      page_count: 1,
    });
    mockDownloadPdf.mockResolvedValue(
      new Blob([new Uint8Array([1, 2, 3])], { type: "application/pdf" }),
    );
    mockSavePdfLocally.mockResolvedValue(undefined);
  });

  it("uploads, compresses, downloads and saves locally", async () => {
    const result = await compressPdf("pdf-1", "medium");

    expect(mockGetLocalPdfById).toHaveBeenCalledWith("pdf-1");
    expect(mockUploadPdf).toHaveBeenCalled();
    expect(mockCompressPdf).toHaveBeenCalledWith("cloud-1", "medium", undefined, false);
    expect(mockDownloadPdf).toHaveBeenCalledWith("cloud-2");
    expect(mockSavePdfLocally).toHaveBeenCalled();
    expect(result).not.toBeNull();
    expect(result!.original_filename).toBe("compressed_test.pdf");
  });

  it("passes quality, fileName and overwrite through to the backend", async () => {
    await compressPdf("pdf-1", "low", "my_compressed", true);

    expect(mockCompressPdf).toHaveBeenCalledWith("cloud-1", "low", "my_compressed", true);
  });

  it("returns null when the local PDF is not found", async () => {
    mockGetLocalPdfById.mockResolvedValue(null);

    const result = await compressPdf("pdf-1", "medium");

    expect(result).toBeNull();
    expect(mockUploadPdf).not.toHaveBeenCalled();
  });

  it("returns null and does not save when the backend fails", async () => {
    mockCompressPdf.mockRejectedValue(new Error("backend error"));

    const result = await compressPdf("pdf-1", "medium");

    expect(result).toBeNull();
    expect(mockSavePdfLocally).not.toHaveBeenCalled();
  });

  it("returns null when the download fails", async () => {
    mockDownloadPdf.mockRejectedValue(new Error("download error"));

    const result = await compressPdf("pdf-1", "medium");

    expect(result).toBeNull();
    expect(mockSavePdfLocally).not.toHaveBeenCalled();
  });
});