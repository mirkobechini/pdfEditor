/**
 * Tests for pdfService metadata operations (updateMetadata).
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
  updateMetadata,
  splitPdf,
  reorderPages,
  removePages,
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

describe("pdfService - updateMetadata", () => {
  it("returns null when PDF not found", async () => {
    mockGetLocalPdfById.mockResolvedValue(null);
    const result = await updateMetadata("nonexistent", "Title");
    expect(result).toBeNull();
  });

  it("updates title and author", async () => {
    const bytes = await createTestPdf();
    mockFileInstance.arrayBuffer.mockResolvedValue(bytes.buffer);
    mockGetLocalPdfById.mockResolvedValue(samplePdf);
    mockSavePdfLocally.mockResolvedValue(undefined);

    const result = await updateMetadata("pdf-1", "New Title", "New Author");
    expect(result).not.toBeNull();
    expect(result!.title).toBe("New Title");
    expect(result!.author).toBe("New Author");
    expect(mockSavePdfLocally).toHaveBeenCalled();
  });

  it("updates only title when author is undefined", async () => {
    const bytes = await createTestPdf();
    mockFileInstance.arrayBuffer.mockResolvedValue(bytes.buffer);
    mockGetLocalPdfById.mockResolvedValue(samplePdf);
    mockSavePdfLocally.mockResolvedValue(undefined);

    const result = await updateMetadata("pdf-1", "Only Title");
    expect(result).not.toBeNull();
    expect(result!.title).toBe("Only Title");
    expect(result!.author).toBe(samplePdf.author);
  });

  it("updates only author when title is undefined", async () => {
    const bytes = await createTestPdf();
    mockFileInstance.arrayBuffer.mockResolvedValue(bytes.buffer);
    mockGetLocalPdfById.mockResolvedValue(samplePdf);
    mockSavePdfLocally.mockResolvedValue(undefined);

    const result = await updateMetadata("pdf-1", undefined, "Only Author");
    expect(result).not.toBeNull();
    expect(result!.author).toBe("Only Author");
    expect(result!.title).toBe(samplePdf.title);
  });

  it("handles catch error gracefully", async () => {
    mockFileInstance.arrayBuffer.mockRejectedValue(new Error("Read failed"));
    mockGetLocalPdfById.mockResolvedValue(samplePdf);

    const result = await updateMetadata("pdf-1", "Title");
    expect(result).toBeNull();
  });
});

describe("pdfService - splitPdf catch (lines 142-143)", () => {
  it("returns empty array on error", async () => {
    mockFileInstance.arrayBuffer.mockRejectedValue(new Error("Read failed"));
    mockGetLocalPdfById.mockResolvedValue(samplePdf);

    const result = await splitPdf("pdf-1", [[1, 1]]);
    expect(result).toEqual([]);
  });
});

describe("pdfService - reorderPages (lines 188-189)", () => {
  it("returns null when PDF not found", async () => {
    mockGetLocalPdfById.mockResolvedValue(null);
    const result = await reorderPages("nonexistent", [1]);
    expect(result).toBeNull();
  });

  it("handles catch error gracefully", async () => {
    mockFileInstance.arrayBuffer.mockRejectedValue(new Error("Read failed"));
    mockGetLocalPdfById.mockResolvedValue(samplePdf);

    const result = await reorderPages("pdf-1", [1]);
    expect(result).toBeNull();
  });

  it("reorders pages with custom filename", async () => {
    const doc = await PDFDocument.create();
    doc.addPage([100, 100]);
    doc.addPage([100, 100]);
    const bytes = await doc.save();

    mockFileInstance.arrayBuffer.mockResolvedValue(bytes.buffer);
    mockGetLocalPdfById.mockResolvedValue(samplePdf);
    mockSavePdfLocally.mockResolvedValue(undefined);

    const result = await reorderPages("pdf-1", [2, 1], "custom.pdf");
    expect(result).not.toBeNull();
    expect(result!.original_filename).toContain("custom");
    expect(mockSavePdfLocally).toHaveBeenCalled();
  });

  it("reorders pages with default filename", async () => {
    const doc = await PDFDocument.create();
    doc.addPage([100, 100]);
    doc.addPage([100, 100]);
    const bytes = await doc.save();

    mockFileInstance.arrayBuffer.mockResolvedValue(bytes.buffer);
    mockGetLocalPdfById.mockResolvedValue(samplePdf);
    mockSavePdfLocally.mockResolvedValue(undefined);

    const result = await reorderPages("pdf-1", [2, 1]);
    expect(result).not.toBeNull();
    expect(result!.original_filename).toContain("reordered");
    expect(mockSavePdfLocally).toHaveBeenCalled();
  });
});

describe("pdfService - removePages branch mancanti", () => {
  it("handles catch error gracefully", async () => {
    mockFileInstance.arrayBuffer.mockRejectedValue(new Error("Read failed"));
    mockGetLocalPdfById.mockResolvedValue(samplePdf);

    const result = await removePages("pdf-1", [1]);
    expect(result).toBeNull();
  });

  it("removes pages with custom filename", async () => {
    const doc = await PDFDocument.create();
    doc.addPage([100, 100]);
    doc.addPage([100, 100]);
    doc.addPage([100, 100]);
    const bytes = await doc.save();

    mockFileInstance.arrayBuffer.mockResolvedValue(bytes.buffer);
    mockGetLocalPdfById.mockResolvedValue(samplePdf);
    mockSavePdfLocally.mockResolvedValue(undefined);

    const result = await removePages("pdf-1", [1], "custom.pdf");
    expect(result).not.toBeNull();
    expect(result!.original_filename).toContain("custom");
    expect(mockSavePdfLocally).toHaveBeenCalled();
  });

  it("removes pages with default filename", async () => {
    const doc = await PDFDocument.create();
    doc.addPage([100, 100]);
    doc.addPage([100, 100]);
    const bytes = await doc.save();

    mockFileInstance.arrayBuffer.mockResolvedValue(bytes.buffer);
    mockGetLocalPdfById.mockResolvedValue(samplePdf);
    mockSavePdfLocally.mockResolvedValue(undefined);

    const result = await removePages("pdf-1", [1]);
    expect(result).not.toBeNull();
    expect(result!.original_filename).toContain("removed-pages");
    expect(mockSavePdfLocally).toHaveBeenCalled();
  });
});
