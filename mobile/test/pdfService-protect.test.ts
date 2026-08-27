/**
 * Tests for pdfService protect/unlock/isPdfEncrypted operations.
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

import {
  protectPdf,
  unlockPdf,
  isPdfEncrypted,
} from "../src/services/pdfService";
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

beforeEach(() => {
  jest.clearAllMocks();
});

describe("pdfService - isPdfEncrypted", () => {
  it("returns false when PDF not found", async () => {
    mockGetLocalPdfById.mockResolvedValue(null);
    const result = await isPdfEncrypted("nonexistent");
    expect(result).toBe(false);
  });

  it("returns false for unencrypted PDF", async () => {
    const bytes = await createTestPdf();
    mockFileInstance.arrayBuffer.mockResolvedValue(bytes.buffer);
    mockGetLocalPdfById.mockResolvedValue(samplePdf);

    const result = await isPdfEncrypted("pdf-1");
    expect(result).toBe(false);
  });

  it("handles catch error gracefully", async () => {
    mockFileInstance.arrayBuffer.mockRejectedValue(new Error("Read failed"));
    mockGetLocalPdfById.mockResolvedValue(samplePdf);

    const result = await isPdfEncrypted("pdf-1");
    expect(result).toBe(false);
  });
});

describe("pdfService - protectPdf", () => {
  it("returns null when PDF not found", async () => {
    mockGetLocalPdfById.mockResolvedValue(null);
    const result = await protectPdf("nonexistent", "pass123");
    expect(result).toBeNull();
  });

  it("protects PDF with password and custom filename", async () => {
    const bytes = await createTestPdf();
    mockFileInstance.arrayBuffer.mockResolvedValue(bytes.buffer);
    mockGetLocalPdfById.mockResolvedValue(samplePdf);
    mockSavePdfLocally.mockResolvedValue(undefined);

    const result = await protectPdf("pdf-1", "pass123", "protected.pdf");
    expect(result).not.toBeNull();
    expect(result!.original_filename).toContain("protected");
    expect(mockSavePdfLocally).toHaveBeenCalled();
  });

  it("protects PDF with default filename", async () => {
    const bytes = await createTestPdf();
    mockFileInstance.arrayBuffer.mockResolvedValue(bytes.buffer);
    mockGetLocalPdfById.mockResolvedValue(samplePdf);
    mockSavePdfLocally.mockResolvedValue(undefined);

    const result = await protectPdf("pdf-1", "pass123");
    expect(result).not.toBeNull();
    expect(result!.original_filename).toContain("protected");
  });

  it("handles catch error gracefully", async () => {
    mockFileInstance.arrayBuffer.mockRejectedValue(new Error("Read failed"));
    mockGetLocalPdfById.mockResolvedValue(samplePdf);

    const result = await protectPdf("pdf-1", "pass123");
    expect(result).toBeNull();
  });
});

describe("pdfService - unlockPdf", () => {
  it("returns null when PDF not found", async () => {
    mockGetLocalPdfById.mockResolvedValue(null);
    const result = await unlockPdf("nonexistent", "pass123");
    expect(result).toBeNull();
  });

  it("unlocks PDF with password and custom filename", async () => {
    const bytes = await createTestPdf();
    mockFileInstance.arrayBuffer.mockResolvedValue(bytes.buffer);
    mockGetLocalPdfById.mockResolvedValue(samplePdf);
    mockSavePdfLocally.mockResolvedValue(undefined);

    const result = await unlockPdf("pdf-1", "pass123", "unlocked.pdf");
    expect(result).not.toBeNull();
    expect(result!.original_filename).toContain("unlocked");
    expect(mockSavePdfLocally).toHaveBeenCalled();
  });

  it("unlocks PDF with default filename", async () => {
    const bytes = await createTestPdf();
    mockFileInstance.arrayBuffer.mockResolvedValue(bytes.buffer);
    mockGetLocalPdfById.mockResolvedValue(samplePdf);
    mockSavePdfLocally.mockResolvedValue(undefined);

    const result = await unlockPdf("pdf-1", "pass123");
    expect(result).not.toBeNull();
    expect(result!.original_filename).toContain("unlocked");
  });

  it("handles catch error gracefully (wrong password)", async () => {
    mockFileInstance.arrayBuffer.mockResolvedValue(new ArrayBuffer(0));
    mockGetLocalPdfById.mockResolvedValue(samplePdf);

    const result = await unlockPdf("pdf-1", "wrongpass");
    expect(result).toBeNull();
  });
});
