/**
 * Tests for pdfService signPdf operation (offline, pdf-lib).
 */

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
const mockSavePdfLocally = jest.fn();
jest.mock("../src/services/localDb", () => ({
  getLocalPdfById: jest.fn(),
  savePdfLocally: (...args: unknown[]) => mockSavePdfLocally(...args),
}));

// Mock shared/api (not used by signPdf but required by module import)
jest.mock("../src/shared/api", () => ({
  api: {},
}));

// Mock pdf-lib so we don't need a real PNG for embedPng
const mockEmbedPng = jest.fn();
const mockDrawImage = jest.fn();
const mockGetPage = jest.fn();
const mockGetPageCount = jest.fn();
const mockSave = jest.fn();
jest.mock("@cantoo/pdf-lib", () => ({
  PDFDocument: {
    load: jest.fn().mockResolvedValue({
      getPageCount: (...args: unknown[]) => mockGetPageCount(...args),
      getPage: (...args: unknown[]) => mockGetPage(...args),
      embedPng: (...args: unknown[]) => mockEmbedPng(...args),
      save: (...args: unknown[]) => mockSave(...args),
    }),
  },
}));

import { signPdf } from "../src/services/pdfService";
import { getLocalPdfById } from "../src/services/localDb";

describe("signPdf", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFileInstance.arrayBuffer.mockResolvedValue(new ArrayBuffer(0));
    mockGetPageCount.mockReturnValue(1);
    mockGetPage.mockReturnValue({ drawImage: mockDrawImage, getHeight: () => 842, getWidth: () => 595 });
    mockEmbedPng.mockResolvedValue({ width: 200, height: 80 });
    mockSave.mockResolvedValue(new Uint8Array([1, 2, 3, 4]));
    // Provide a real PDF for getLocalPdfById
    (getLocalPdfById as jest.Mock).mockResolvedValue({
      id: "pdf-1",
      original_filename: "test.pdf",
      file_size: 1024,
      page_count: 1,
      uri: "file:///pdfs/test.pdf",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    });
  });

  it("signs a PDF and returns a new LocalPdf", async () => {
    const result = await signPdf("pdf-1", "c2ln", 1, 50, 50, 200, 80);

    expect(result).not.toBeNull();
    expect(result!.original_filename).toContain("signed_");
    expect(result!.page_count).toBe(1);
    expect(mockEmbedPng).toHaveBeenCalled();
    expect(mockDrawImage).toHaveBeenCalled();
    expect(mockSavePdfLocally).toHaveBeenCalled();
  });

  it("flips the y coordinate from top-left (screen space) to bottom-left (PDF space)", async () => {
    // page height 842, box top-left y=50, height=80 -> pdf-lib y = 842 - 50 - 80 = 712
    await signPdf("pdf-1", "c2ln", 1, 100, 50, 200, 80);

    expect(mockDrawImage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ x: 100, y: 712, width: 200, height: 80 }),
    );
  });

  it("fits a wider-than-box image inside the box preserving aspect ratio, centered vertically", async () => {
    // image 400x100 (aspect 4) into a 200x80 box (aspect 2.5) -> constrained
    // by width: drawWidth=200, drawHeight=200/4=50, centered: dy=(80-50)/2=15
    mockEmbedPng.mockResolvedValue({ width: 400, height: 100 });

    await signPdf("pdf-1", "c2ln", 1, 100, 50, 200, 80);

    // top-left y=50, drawHeight=50 -> pdf-lib y = 842 - 50 - 50 - 15(centering) = 727
    expect(mockDrawImage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ x: 100, y: 727, width: 200, height: 50 }),
    );
  });

  it("returns null when PDF not found", async () => {
    (getLocalPdfById as jest.Mock).mockResolvedValue(null);

    const result = await signPdf("pdf-1", "c2ln", 1, 50, 50, 200, 80);
    expect(result).toBeNull();
  });

  it("returns null when page is out of range", async () => {
    mockGetPageCount.mockReturnValue(1);

    const result = await signPdf("pdf-1", "c2ln", 99, 50, 50, 200, 80);
    expect(result).toBeNull();
  });

  it("returns null on invalid signature image", async () => {
    mockEmbedPng.mockRejectedValue(new Error("invalid png"));

    const result = await signPdf(
      "pdf-1",
      "!!!not-valid!!!",
      1,
      50,
      50,
      200,
      80,
    );
    expect(result).toBeNull();
  });
});
