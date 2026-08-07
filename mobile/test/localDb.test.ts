/**
 * Tests for localDb — SQLite operations.
 * Requires mocking expo-sqlite.
 */
jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn(async () => ({
    execAsync: jest.fn(),
    runAsync: jest.fn(),
    getAllAsync: jest.fn(async () => []),
    getFirstAsync: jest.fn(async () => null),
  })),
}));

import * as SQLite from "expo-sqlite";
import {
  savePdfLocally,
  getLocalPdfs,
  getLocalPdfById,
  deleteLocalPdf,
} from "../src/services/localDb";
import type { LocalPdf } from "../src/shared/types";

const mockDb = {
  execAsync: jest.fn(),
  runAsync: jest.fn(),
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(mockDb);
});

const samplePdf: LocalPdf = {
  id: "test-1",
  original_filename: "test.pdf",
  file_size: 1024,
  page_count: 3,
  uri: "file:///pdfs/test-1.pdf",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("localDb", () => {
  it("savePdfLocally calls runAsync with INSERT OR REPLACE", async () => {
    mockDb.runAsync.mockResolvedValue(undefined);
    await savePdfLocally(samplePdf);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR REPLACE"),
      expect.arrayContaining([samplePdf.id, samplePdf.original_filename]),
    );
  });

  it("getLocalPdfs returns all PDFs ordered by updated_at DESC", async () => {
    mockDb.getAllAsync.mockResolvedValue([samplePdf]);
    const result = await getLocalPdfs();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("test-1");
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining("SELECT * FROM pdfs"),
    );
  });

  it("getLocalPdfById returns single PDF", async () => {
    mockDb.getFirstAsync.mockResolvedValue(samplePdf);
    const result = await getLocalPdfById("test-1");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("test-1");
  });

  it("getLocalPdfById returns null when not found", async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);
    const result = await getLocalPdfById("nonexistent");
    expect(result).toBeNull();
  });

  it("deleteLocalPdf calls runAsync with DELETE", async () => {
    mockDb.runAsync.mockResolvedValue(undefined);
    await deleteLocalPdf("test-1");
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("DELETE"),
      ["test-1"],
    );
  });
});
