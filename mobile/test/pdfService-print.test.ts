/**
 * Tests for printService printPdf operation.
 * Uses expo-print to open the native print dialog.
 */

// Mock expo-print (imported statically by printService)
const mockPrintAsync = jest.fn();
jest.mock("expo-print", () => ({
  printAsync: (...args: unknown[]) => mockPrintAsync(...args),
}));

import { printPdf } from "../src/services/printService";

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
