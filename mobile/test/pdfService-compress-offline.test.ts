/**
 * Tests for pdfService compressPdfOffline operation (offline, pdf-lib re-save).
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

// Mock shared/api (not used by compressPdfOffline but required by module import)
jest.mock("../src/shared/api", () => ({
  api: {},
}));

import { compressPdfOffline } from "../src/services/pdfService";
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

describe("compressPdfOffline", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLocalPdfById.mockResolvedValue(samplePdf);
    mockSavePdfLocally.mockResolvedValue(undefined);
    mockFileInstance.arrayBuffer.mockResolvedValue(createTestPdf());
  });

  it("re-saves the PDF locally and saves metadata", async () => {
    const result = await compressPdfOffline("pdf-1", "medium");

    expect(mockGetLocalPdfById).toHaveBeenCalledWith("pdf-1");
    expect(mockSavePdfLocally).toHaveBeenCalled();
    expect(result).not.toBeNull();
    expect(result!.original_filename).toBe("compressed_test.pdf");
    expect(result!.page_count).toBe(1);
  });

  it("uses the provided fileName for the output", async () => {
    const result = await compressPdfOffline("pdf-1", "low", "my_compressed");

    expect(result).not.toBeNull();
    expect(result!.original_filename).toBe("my_compressed.pdf");
  });

  it("returns null when the local PDF is not found", async () => {
    mockGetLocalPdfById.mockResolvedValue(null);

    const result = await compressPdfOffline("pdf-1", "medium");

    expect(result).toBeNull();
    expect(mockSavePdfLocally).not.toHaveBeenCalled();
  });

  it("returns null when the PDF cannot be loaded", async () => {
    mockFileInstance.arrayBuffer.mockResolvedValue(new Uint8Array([1, 2, 3])); // invalid PDF

    const result = await compressPdfOffline("pdf-1", "medium");

    expect(result).toBeNull();
    expect(mockSavePdfLocally).not.toHaveBeenCalled();
  });
});