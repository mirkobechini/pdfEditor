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
  markPdfCloudSynced,
  markPdfCloudUnsynced,
  getUnsyncedPdfs,
  getOrphanPdfs,
  togglePdfSyncExclude,
  getSyncedPdfs,
  getLocalPdfsByUser,
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
      expect.stringContaining("COALESCE"),
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

  it("savePdfLocally updates original_filename on rename", async () => {
    mockDb.runAsync.mockResolvedValue(undefined);
    const renamed = {
      ...samplePdf,
      original_filename: "renamed.pdf",
      updated_at: "2026-08-22T00:00:00Z",
    };
    await savePdfLocally(renamed);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR REPLACE"),
      expect.arrayContaining(["renamed.pdf"]),
    );
  });

  // ─── Cloud sync helpers ─────────────────────────────────────────

  it("markPdfCloudSynced sets cloud_synced=1", async () => {
    mockDb.runAsync.mockResolvedValue(undefined);
    await markPdfCloudSynced("test-1");
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE"),
      expect.arrayContaining(["test-1"]),
    );
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("cloud_synced = 1"),
      expect.anything(),
    );
  });

  it("markPdfCloudUnsynced sets cloud_synced=0", async () => {
    mockDb.runAsync.mockResolvedValue(undefined);
    await markPdfCloudUnsynced("test-1");
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("cloud_synced = 0"),
      expect.anything(),
    );
  });

  it("getUnsyncedPdfs filters by cloud_synced=0", async () => {
    mockDb.getAllAsync.mockResolvedValue([samplePdf]);
    const result = await getUnsyncedPdfs();
    expect(result).toHaveLength(1);
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining("cloud_synced IS NULL OR cloud_synced = 0"),
    );
  });

  it("getOrphanPdfs filters by empty user_id", async () => {
    mockDb.getAllAsync.mockResolvedValue([samplePdf]);
    const result = await getOrphanPdfs();
    expect(result).toHaveLength(1);
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining("user_id IS NULL"),
    );
  });

  // ─── Additional helpers ─────────────────────────────────────────

  it("getLocalPdfs with userId filters by user", async () => {
    mockDb.getAllAsync.mockResolvedValue([samplePdf]);
    const result = await getLocalPdfs("user-1");
    expect(result).toHaveLength(1);
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining("user_id = ?"),
      ["user-1"],
    );
  });

  it("togglePdfSyncExclude sets cloud_synced_exclude=1", async () => {
    mockDb.runAsync.mockResolvedValue(undefined);
    await togglePdfSyncExclude("test-1", true);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("cloud_synced_exclude = ?"),
      [1, "test-1"],
    );
  });

  it("togglePdfSyncExclude sets cloud_synced_exclude=0", async () => {
    mockDb.runAsync.mockResolvedValue(undefined);
    await togglePdfSyncExclude("test-1", false);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("cloud_synced_exclude = ?"),
      [0, "test-1"],
    );
  });

  it("getSyncedPdfs returns synced PDFs", async () => {
    mockDb.getAllAsync.mockResolvedValue([samplePdf]);
    const result = await getSyncedPdfs();
    expect(result).toHaveLength(1);
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining("cloud_synced = 1"),
    );
  });

  it("getLocalPdfsByUser filters by user_id", async () => {
    mockDb.getAllAsync.mockResolvedValue([samplePdf]);
    const result = await getLocalPdfsByUser("user-1");
    expect(result).toHaveLength(1);
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining("WHERE user_id = ?"),
      ["user-1"],
    );
  });
});
