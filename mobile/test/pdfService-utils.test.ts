/**
 * Tests for pdfService utility functions (readPdfBytes, writePdfBytes, getPdfDir, generateId).
 *
 * These are internal helpers tested through the public API.
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
  mergePdfs,
  splitPdf,
  reorderPages,
  removePages,
  updateMetadata,
  isPdfEncrypted,
  protectPdf,
  unlockPdf,
  normalizeFilename,
} from "../src/services/pdfService";
import type { LocalPdf } from "../src/shared/types";

// ─── Helpers ──────────────────────────────────────────────────────

async function createTestPdf(text = "Test"): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([300, 200]);
  page.drawText(text, { x: 50, y: 100 });
  return doc.save();
}

const samplePdf: LocalPdf = {
  id: "pdf-1",
  original_filename: "test.pdf",
  file_size: 1024,
  page_count: 3,
  uri: "file:///pdfs/pdf-1.pdf",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockFileInstance.arrayBuffer.mockReset();
  mockDirInstance.exists = true;
  mockDirInstance.create.mockClear();
});

// ─── Tests ────────────────────────────────────────────────────────

describe("pdfService utilities", () => {
  describe("normalizeFilename", () => {
    it("leaves a plain filename untouched", () => {
      expect(normalizeFilename("React Hooks.pdf")).toBe("React Hooks.pdf");
    });

    it("decodes a single layer of percent-encoding", () => {
      expect(normalizeFilename("React%20Hooks.pdf")).toBe("React Hooks.pdf");
    });

    it("decodes multiple compounded layers of percent-encoding", () => {
      // "%20" encoded again becomes "%2520" ("%" -> "%25"); this is the
      // pattern actually seen on device after a file round-tripped through
      // several upload-based operations (annotate, OCR, ...).
      expect(normalizeFilename("React%2520Hooks.pdf")).toBe("React Hooks.pdf");
      expect(normalizeFilename("React%252520Hooks.pdf")).toBe("React Hooks.pdf");
    });

    it("returns the input unchanged on a malformed percent-sequence instead of throwing", () => {
      expect(normalizeFilename("100% done.pdf")).toBe("100% done.pdf");
    });
  });

  describe("readPdfBytes (lines 33-34)", () => {
    it("reads bytes from a PDF file via mergePdfs", async () => {
      const pdfBytes = await createTestPdf("Hello");
      mockFileInstance.arrayBuffer.mockResolvedValue(pdfBytes.buffer);
      mockGetLocalPdfById.mockImplementation(async (id: string) => {
        if (id === "pdf-1") return { ...samplePdf, id: "pdf-1" };
        if (id === "pdf-2") return { ...samplePdf, id: "pdf-2" };
        return null;
      });
      mockSavePdfLocally.mockResolvedValue(undefined);

      const result = await mergePdfs(["pdf-1", "pdf-2"], "merged.pdf");
      expect(result).not.toBeNull();
      expect(mockFileInstance.arrayBuffer).toHaveBeenCalled();
    });

    it("handles read error gracefully via mergePdfs catch", async () => {
      mockFileInstance.arrayBuffer.mockRejectedValue(new Error("Read failed"));
      mockGetLocalPdfById.mockResolvedValue(samplePdf);
      mockSavePdfLocally.mockResolvedValue(undefined);

      const result = await mergePdfs(["pdf-1", "pdf-2"], "merged.pdf");
      expect(result).toBeNull();
    });
  });

  describe("writePdfBytes (lines 90-91)", () => {
    it("writes bytes via mergePdfs and calls writeAsStringAsync", async () => {
      const pdfBytes = await createTestPdf("Write test");
      mockFileInstance.arrayBuffer.mockResolvedValue(pdfBytes.buffer);
      mockGetLocalPdfById.mockImplementation(async (id: string) => {
        if (id === "pdf-1") return { ...samplePdf, id: "pdf-1" };
        if (id === "pdf-2") return { ...samplePdf, id: "pdf-2" };
        return null;
      });
      mockSavePdfLocally.mockResolvedValue(undefined);

      const result = await mergePdfs(["pdf-1", "pdf-2"], "merged.pdf");
      expect(result).not.toBeNull();

      const { writeAsStringAsync } = require("expo-file-system/legacy");
      expect(writeAsStringAsync).toHaveBeenCalled();
    });
  });

  describe("getPdfDir (lines 38-47)", () => {
    it("creates directory when it does not exist", async () => {
      mockDirInstance.exists = false;
      const pdfBytes = await createTestPdf("Dir test");
      mockFileInstance.arrayBuffer.mockResolvedValue(pdfBytes.buffer);
      mockGetLocalPdfById.mockImplementation(async (id: string) => {
        if (id === "pdf-1") return { ...samplePdf, id: "pdf-1" };
        if (id === "pdf-2") return { ...samplePdf, id: "pdf-2" };
        return null;
      });
      mockSavePdfLocally.mockResolvedValue(undefined);

      const result = await mergePdfs(["pdf-1", "pdf-2"], "merged.pdf");
      expect(result).not.toBeNull();
      expect(mockDirInstance.create).toHaveBeenCalled();
    });

    it("handles directory creation error gracefully", async () => {
      mockDirInstance.exists = false;
      mockDirInstance.create.mockImplementation(() => {
        throw new Error("Already exists");
      });
      const pdfBytes = await createTestPdf("Dir error");
      mockFileInstance.arrayBuffer.mockResolvedValue(pdfBytes.buffer);
      mockGetLocalPdfById.mockImplementation(async (id: string) => {
        if (id === "pdf-1") return { ...samplePdf, id: "pdf-1" };
        if (id === "pdf-2") return { ...samplePdf, id: "pdf-2" };
        return null;
      });
      mockSavePdfLocally.mockResolvedValue(undefined);

      const result = await mergePdfs(["pdf-1", "pdf-2"], "merged.pdf");
      expect(result).not.toBeNull();
      expect(mockDirInstance.create).toHaveBeenCalled();
    });

    it("does not create directory when it already exists", async () => {
      mockDirInstance.exists = true;
      const pdfBytes = await createTestPdf("Dir exists");
      mockFileInstance.arrayBuffer.mockResolvedValue(pdfBytes.buffer);
      mockGetLocalPdfById.mockImplementation(async (id: string) => {
        if (id === "pdf-1") return { ...samplePdf, id: "pdf-1" };
        if (id === "pdf-2") return { ...samplePdf, id: "pdf-2" };
        return null;
      });
      mockSavePdfLocally.mockResolvedValue(undefined);

      const result = await mergePdfs(["pdf-1", "pdf-2"], "merged.pdf");
      expect(result).not.toBeNull();
      expect(mockDirInstance.create).not.toHaveBeenCalled();
    });
  });

  describe("generateId (line 25)", () => {
    it("generates unique IDs for each PDF operation", async () => {
      const pdfBytes = await createTestPdf("ID test");
      mockFileInstance.arrayBuffer.mockResolvedValue(pdfBytes.buffer);
      mockGetLocalPdfById.mockImplementation(async (id: string) => {
        if (id === "pdf-1") return { ...samplePdf, id: "pdf-1" };
        if (id === "pdf-2") return { ...samplePdf, id: "pdf-2" };
        return null;
      });
      mockSavePdfLocally.mockResolvedValue(undefined);

      const result1 = await mergePdfs(["pdf-1", "pdf-2"], "merge1.pdf");
      const result2 = await mergePdfs(["pdf-1", "pdf-2"], "merge2.pdf");
      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();
      expect(result1!.id).not.toBe(result2!.id);
    });
  });
});
