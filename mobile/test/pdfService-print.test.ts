/**
 * Tests for printService's printPdf operation.
 * Uses expo-print to open the native print dialog, with an optional
 * pdf-lib pre-filter step when the user picks a page range narrower than
 * the whole document.
 */
import { PDFDocument } from "@cantoo/pdf-lib";

const SOURCE_URI = "file:///pdfs/source.pdf";
const TEMP_URI = "file:///cache/print-temp.pdf";

// Mock expo-print (imported statically by printService)
const mockPrintAsync = jest.fn();
jest.mock("expo-print", () => ({
  printAsync: (...args: unknown[]) => mockPrintAsync(...args),
  Orientation: { portrait: "portrait", landscape: "landscape" },
}));

let mockSourceBytes: Uint8Array = new Uint8Array();
let mockLastWrittenBase64: string | null = null;
const mockFileDelete = jest.fn();

jest.mock("expo-file-system", () => ({
  File: jest.fn().mockImplementation((...args: unknown[]) => {
    if (args.length === 1 && args[0] === SOURCE_URI) {
      return {
        uri: SOURCE_URI,
        arrayBuffer: jest.fn().mockImplementation(async () => {
          const copy = new Uint8Array(mockSourceBytes);
          return copy.buffer;
        }),
      };
    }
    // new File(Paths.cache, "print-<ts>.pdf") — the temp filtered-copy target
    return { uri: TEMP_URI, delete: mockFileDelete };
  }),
  Directory: jest.fn().mockImplementation(() => ({ exists: true, create: jest.fn(), uri: "file:///pdfs/" })),
  Paths: { document: "file:///documents", cache: "file:///cache" },
}));

jest.mock("expo-file-system/legacy", () => ({
  writeAsStringAsync: jest.fn(async (_uri: string, base64: string) => {
    mockLastWrittenBase64 = base64;
  }),
  EncodingType: { Base64: "base64" },
}));

jest.mock("../src/services/localDb", () => ({
  getLocalPdfById: jest.fn(),
  savePdfLocally: jest.fn(),
}));

import { printPdf } from "../src/services/printService";

async function createTestPdf(numPages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < numPages; i++) doc.addPage([100, 100]);
  return doc.save();
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

describe("printPdf", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrintAsync.mockResolvedValue(undefined);
    mockLastWrittenBase64 = null;
    mockSourceBytes = await createTestPdf(5);
  });

  it("prints the original file as-is when no options are given", async () => {
    const result = await printPdf(SOURCE_URI, 5);

    expect(mockPrintAsync).toHaveBeenCalledWith({ uri: SOURCE_URI });
    expect(result).toBe(true);
    expect(mockLastWrittenBase64).toBeNull(); // no filtered copy was built
  });

  it("prints the original file as-is when the range covers every page", async () => {
    await printPdf(SOURCE_URI, 5, { pageRange: "1-5", orientation: "auto" });

    expect(mockPrintAsync).toHaveBeenCalledWith({ uri: SOURCE_URI });
    expect(mockLastWrittenBase64).toBeNull();
  });

  it("builds and prints a filtered copy when a narrower page range is chosen", async () => {
    await printPdf(SOURCE_URI, 5, { pageRange: "1-2", orientation: "auto" });

    expect(mockLastWrittenBase64).not.toBeNull();
    const filteredBytes = base64ToBytes(mockLastWrittenBase64 as string);
    const filtered = await PDFDocument.load(filteredBytes);
    expect(filtered.getPageCount()).toBe(2);

    expect(mockPrintAsync).toHaveBeenCalledWith({ uri: TEMP_URI });
  });

  it("deletes the temporary filtered copy after printing", async () => {
    await printPdf(SOURCE_URI, 5, { pageRange: "1-2", orientation: "auto" });
    expect(mockFileDelete).toHaveBeenCalled();
  });

  it("deletes the temporary filtered copy even when printing fails", async () => {
    mockPrintAsync.mockRejectedValue(new Error("print error"));
    const result = await printPdf(SOURCE_URI, 5, { pageRange: "1-2", orientation: "auto" });
    expect(result).toBe(false);
    expect(mockFileDelete).toHaveBeenCalled();
  });

  it("passes the chosen orientation through to expo-print", async () => {
    await printPdf(SOURCE_URI, 5, { pageRange: "", orientation: "portrait" });
    expect(mockPrintAsync).toHaveBeenCalledWith({ uri: SOURCE_URI, orientation: "portrait" });

    await printPdf(SOURCE_URI, 5, { pageRange: "", orientation: "landscape" });
    expect(mockPrintAsync).toHaveBeenCalledWith({ uri: SOURCE_URI, orientation: "landscape" });
  });

  it("returns false when printAsync fails", async () => {
    mockPrintAsync.mockRejectedValue(new Error("print error"));

    const result = await printPdf(SOURCE_URI, 5);

    expect(result).toBe(false);
  });
});
