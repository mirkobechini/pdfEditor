/**
 * Tests for usePdfStorage's pickAndSavePdf — previously untested.
 * Focused on the filename normalization added for issue #866 (a percent-
 * encoded display name from DocumentPicker, e.g. from a content provider
 * that returns an already-encoded name, must be decoded before it's stored
 * and re-uploaded on every subsequent operation).
 */
import { renderHook, act } from "@testing-library/react-native";

const mockGetDocumentAsync = jest.fn();
jest.mock("expo-document-picker", () => ({
  getDocumentAsync: (...args: unknown[]) => mockGetDocumentAsync(...args),
}));

const mockCopy = jest.fn();
const mockDestFile = { exists: true, size: 2048, uri: "file:///documents/PdfEditor/new-id.pdf" };
jest.mock("expo-file-system", () => ({
  Paths: { document: "file:///documents" },
  File: jest.fn().mockImplementation((...args: unknown[]) => {
    // First File(...) call is the source, second is the destination — both
    // hooks reuse the same mock shape since only destFile's fields are read.
    return { ...mockDestFile, copy: mockCopy, uri: args.join("/") || mockDestFile.uri };
  }),
  Directory: jest.fn().mockImplementation(() => ({ create: jest.fn() })),
}));

const mockGetPageCount = jest.fn(() => 1);
const mockGetCreationDate = jest.fn(() => null);
jest.mock("@cantoo/pdf-lib", () => ({
  PDFDocument: {
    load: jest.fn().mockResolvedValue({
      getPageCount: () => mockGetPageCount(),
      getCreationDate: () => mockGetCreationDate(),
    }),
  },
}));

const mockSavePdfLocally = jest.fn();
jest.mock("../src/services/localDb", () => ({
  savePdfLocally: (...args: unknown[]) => mockSavePdfLocally(...args),
  getLocalPdfs: jest.fn(),
  deleteLocalPdf: jest.fn(),
  getLocalPdfById: jest.fn(),
}));

import { usePdfStorage } from "../src/hooks/usePdfStorage";

describe("usePdfStorage.pickAndSavePdf", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // destFile.arrayBuffer() is called to count pages via pdf-lib
    (mockDestFile as any).arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(0));
  });

  it("decodes a percent-encoded display name from the document picker", async () => {
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "content://provider/document/1", name: "React%20Hooks.pdf", size: 2048 }],
    });

    const { result } = await renderHook(() => usePdfStorage());
    let saved: any;
    await act(async () => {
      saved = await result.current.pickAndSavePdf("user-1");
    });

    expect(saved?.original_filename).toBe("React Hooks.pdf");
    expect(mockSavePdfLocally).toHaveBeenCalledWith(
      expect.objectContaining({ original_filename: "React Hooks.pdf" }),
    );
  });

  it("leaves an already-clean display name untouched", async () => {
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "content://provider/document/2", name: "Invoice.pdf", size: 2048 }],
    });

    const { result } = await renderHook(() => usePdfStorage());
    let saved: any;
    await act(async () => {
      saved = await result.current.pickAndSavePdf("user-1");
    });

    expect(saved?.original_filename).toBe("Invoice.pdf");
  });
});
