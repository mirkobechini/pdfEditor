/**
 * Tests for pdfService OCR, annotation and share operations (cloud).
 * Flow: upload local PDF → cloud op → download → save locally.
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
const mockOcrPdf = jest.fn();
const mockAddAnnotation = jest.fn();
const mockCreateShareLink = jest.fn();
const mockListShareLinks = jest.fn();
const mockRevokeShareLink = jest.fn();
const mockDownloadPdf = jest.fn();
jest.mock("../src/shared/api", () => ({
  api: {
    uploadPdf: (...args: unknown[]) => mockUploadPdf(...args),
    ocrPdf: (...args: unknown[]) => mockOcrPdf(...args),
    addAnnotation: (...args: unknown[]) => mockAddAnnotation(...args),
    createShareLink: (...args: unknown[]) => mockCreateShareLink(...args),
    listShareLinks: (...args: unknown[]) => mockListShareLinks(...args),
    revokeShareLink: (...args: unknown[]) => mockRevokeShareLink(...args),
    downloadPdf: (...args: unknown[]) => mockDownloadPdf(...args),
  },
}));

import { ocrPdf, addAnnotation, createShareLink, listShareLinks, revokeShareLink } from "../src/services/pdfService";

const localPdf = {
  id: "local1",
  original_filename: "scan.pdf",
  file_size: 100,
  page_count: 1,
  uri: "file:///pdfs/scan.pdf",
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

const cloudPdf = {
  id: "cloud1",
  original_filename: "scan.pdf",
  file_size: 200,
  page_count: 1,
};

describe("pdfService parity (OCR, annotation, share)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLocalPdfById.mockResolvedValue(localPdf);
    mockUploadPdf.mockResolvedValue(cloudPdf);
    mockDownloadPdf.mockResolvedValue(new Blob([new Uint8Array([1, 2, 3])]));
    mockSavePdfLocally.mockResolvedValue(undefined);
  });

  it("ocrPdf uploads, runs OCR, downloads and saves locally", async () => {
    mockOcrPdf.mockResolvedValue(cloudPdf);
    const result = await ocrPdf("local1", "eng");
    expect(mockUploadPdf).toHaveBeenCalled();
    expect(mockOcrPdf).toHaveBeenCalledWith("cloud1", "eng");
    expect(mockDownloadPdf).toHaveBeenCalledWith("cloud1");
    expect(mockSavePdfLocally).toHaveBeenCalled();
    expect(result).not.toBeNull();
  });

  it("addAnnotation uploads, adds annotation, downloads and saves locally", async () => {
    mockAddAnnotation.mockResolvedValue(cloudPdf);
    const result = await addAnnotation("local1", {
      page: 1,
      type: "highlight",
      rect: [50, 50, 250, 100],
      color: "#FFFF00",
    });
    expect(mockUploadPdf).toHaveBeenCalled();
    expect(mockAddAnnotation).toHaveBeenCalled();
    expect(mockDownloadPdf).toHaveBeenCalledWith("cloud1");
    expect(mockSavePdfLocally).toHaveBeenCalled();
    expect(result).not.toBeNull();
  });

  it("createShareLink uploads and creates link", async () => {
    mockCreateShareLink.mockResolvedValue({ token: "t1", url: "http://x/t1" });
    const link = await createShareLink("local1", "pass", 7);
    expect(mockUploadPdf).toHaveBeenCalled();
    expect(mockCreateShareLink).toHaveBeenCalledWith("cloud1", "pass", 7);
    expect(link).toEqual({ token: "t1", url: "http://x/t1" });
  });

  it("listShareLinks returns links", async () => {
    mockListShareLinks.mockResolvedValue([{ token: "t1" }]);
    const links = await listShareLinks("local1");
    expect(mockListShareLinks).toHaveBeenCalledWith("cloud1");
    expect(links).toEqual([{ token: "t1" }]);
  });

  it("revokeShareLink revokes a link", async () => {
    await revokeShareLink("local1", "t1");
    expect(mockRevokeShareLink).toHaveBeenCalledWith("cloud1", "t1");
  });
});