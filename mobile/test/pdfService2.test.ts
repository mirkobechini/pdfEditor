/**
 * Tests for additional pdfService operations.
 */
import { removePages } from "../src/services/pdfService";

// Mock localDb
jest.mock("../src/services/localDb", () => ({
  getLocalPdfById: jest.fn(),
  savePdfLocally: jest.fn(),
}));

// Mock expo-file-system
jest.mock("expo-file-system", () => ({
  File: jest.fn().mockImplementation(() => ({
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
  })),
  Directory: jest.fn().mockImplementation(() => ({
    exists: true,
    create: jest.fn(),
    uri: "file:///pdfs/",
  })),
  Paths: { document: "file:///documents" },
}));

jest.mock("expo-file-system/legacy", () => ({
  writeAsStringAsync: jest.fn(),
  EncodingType: { Base64: "base64" },
}));

import { getLocalPdfById, savePdfLocally } from "../src/services/localDb";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("pdfService - removePages", () => {
  it("returns null when PDF not found", async () => {
    (getLocalPdfById as jest.Mock).mockResolvedValue(null);
    const result = await removePages("nonexistent", [1]);
    expect(result).toBeNull();
  });

  it("returns null for empty pages", async () => {
    const result = await removePages("test", []);
    expect(result).toBeNull;
  });
});
