/**
 * Tests for pdfService printPdf operation.
 * Uses expo-print to open the native print dialog.
 */

// Mock expo-file-system (pdfService imports it)
jest.mock("expo-file-system", () => ({
  File: jest.fn(),
  Directory: jest.fn(),
  Paths: { document: "file:///documents" },
}));

jest.mock("expo-file-system/legacy", () => ({
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  EncodingType: { Base64: "base64" },
}));

// Mock localDb (pdfService imports it)
jest.mock("../src/services/localDb", () => ({
  getLocalPdfById: jest.fn(),
  savePdfLocally: jest.fn(),
}));

// Mock shared/api (pdfService imports it)
jest.mock("../src/shared/api", () => ({
  api: {},
}));

// Mock expo-print (dynamic import)
const mockPrintAsync = jest.fn();
jest.mock("expo-print", () => ({
  printAsync: (...args: unknown[]) => mockPrintAsync(...args),
}));

import { printPdf } from "../src/services/pdfService";

describe("printPdf", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrintAsync.mockResolvedValue(undefined);
  });

  it("calls printAsync with the file uri", async () => {
    const result = await printPdf("file:///pdfs/test.pdf");

    expect(mockPrintAsync).toHaveBeenCalledWith({
      uri: "file:///pdfs/test.pdf",
    });
    expect(result).toBe(true);
  });

  it("returns false when printAsync fails", async () => {
    mockPrintAsync.mockRejectedValue(new Error("print error"));

    const result = await printPdf("file:///pdfs/test.pdf");

    expect(result).toBe(false);
  });
});
