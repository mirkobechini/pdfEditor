/**
 * Tests for pdfService exportPdf and importFile operations.
 * Both require connection — they call the cloud backend.
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
const mockSavePdfLocally = jest.fn();
jest.mock("../src/services/localDb", () => ({
  getLocalPdfById: jest.fn(),
  savePdfLocally: (...args: unknown[]) => mockSavePdfLocally(...args),
}));

// Mock shared/api
const mockExportPdf = jest.fn();
const mockImportFile = jest.fn();
const mockDownloadPdf = jest.fn();
jest.mock("../src/shared/api", () => ({
  api: {
    exportPdf: (...args: unknown[]) => mockExportPdf(...args),
    importFile: (...args: unknown[]) => mockImportFile(...args),
    downloadPdf: (...args: unknown[]) => mockDownloadPdf(...args),
  },
}));

import { exportPdf, importFile } from "../src/services/pdfService";

describe("exportPdf", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExportPdf.mockResolvedValue(
      new Blob([new Uint8Array([1, 2, 3])], { type: "text/plain" }),
    );
  });

  it("exports a PDF to the requested format and returns uri and name", async () => {
    const result = await exportPdf("pdf-1", "txt", "test.pdf");

    expect(mockExportPdf).toHaveBeenCalledWith("pdf-1", "txt");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("test.txt");
    expect(result!.uri).toContain(".txt");
  });

  it("sanitizes the base name", async () => {
    const result = await exportPdf("pdf-1", "png", "my file/name.pdf");

    expect(result!.name).toBe("my file_name.png");
  });

  it("returns null when the backend fails", async () => {
    mockExportPdf.mockRejectedValue(new Error("backend error"));

    const result = await exportPdf("pdf-1", "txt", "test.pdf");

    expect(result).toBeNull();
  });
});

describe("importFile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockImportFile.mockResolvedValue({
      id: "cloud-1",
      original_filename: "imported.pdf",
      page_count: 1,
    });
    mockDownloadPdf.mockResolvedValue(
      new Blob([new Uint8Array([1, 2, 3])], { type: "application/pdf" }),
    );
    mockSavePdfLocally.mockResolvedValue(undefined);
  });

  it("imports a file, downloads the PDF and saves locally", async () => {
    const result = await importFile(
      "file:///docs/hello.txt",
      "hello.txt",
      "text/plain",
    );

    expect(mockImportFile).toHaveBeenCalledWith(
      "file:///docs/hello.txt",
      "hello.txt",
      "text/plain",
    );
    expect(mockDownloadPdf).toHaveBeenCalledWith("cloud-1");
    expect(mockSavePdfLocally).toHaveBeenCalled();
    expect(result).not.toBeNull();
    expect(result!.original_filename).toBe("imported.pdf");
  });

  it("imports a DOCX file", async () => {
    const result = await importFile(
      "file:///docs/doc.docx",
      "doc.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );

    expect(mockImportFile).toHaveBeenCalledWith(
      "file:///docs/doc.docx",
      "doc.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    expect(mockDownloadPdf).toHaveBeenCalledWith("cloud-1");
    expect(mockSavePdfLocally).toHaveBeenCalled();
    expect(result).not.toBeNull();
  });

  it("returns null when the backend fails", async () => {
    mockImportFile.mockRejectedValue(new Error("backend error"));

    const result = await importFile(
      "file:///docs/hello.txt",
      "hello.txt",
      "text/plain",
    );

    expect(result).toBeNull();
    expect(mockSavePdfLocally).not.toHaveBeenCalled();
  });
});
