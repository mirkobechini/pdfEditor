/**
 * Tests for usePdfStorage — local PDF storage logic.
 *
 * Tests the hook's core operations by calling the underlying
 * localDb functions. Uses jest.isolateModulesAsync to get a fresh
 * module singleton per test.
 */

// Mocks at the top
jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn(),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const samplePdf = {
  id: "pdf-1",
  original_filename: "test.pdf",
  file_size: 1024,
  page_count: 3,
  uri: "file:///pdfs/pdf-1.pdf",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function mockDb() {
  return {
    execAsync: jest.fn(),
    runAsync: jest.fn(),
    getAllAsync: jest.fn(),
    getFirstAsync: jest.fn(),
  };
}

describe("usePdfStorage logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("loadLocalPdfs", () => {
    it("returns PDFs list from localDb", async () => {
      await jest.isolateModulesAsync(async () => {
        const db = mockDb();
        db.getAllAsync.mockResolvedValue([samplePdf]);
        const SQLite = require("expo-sqlite");
        SQLite.openDatabaseAsync.mockResolvedValue(db);

        const { getLocalPdfs } = require("../src/services/localDb");
        const pdfs = await getLocalPdfs();
        expect(pdfs).toHaveLength(1);
        expect(pdfs[0].id).toBe("pdf-1");
      });
    });
  });

  describe("removeLocalPdf", () => {
    it("deletes PDF file and DB record", async () => {
      await jest.isolateModulesAsync(async () => {
        const db = mockDb();
        db.getFirstAsync.mockResolvedValue(samplePdf);
        db.runAsync.mockResolvedValue(undefined);
        const SQLite = require("expo-sqlite");
        SQLite.openDatabaseAsync.mockResolvedValue(db);

        const {
          getLocalPdfById,
          deleteLocalPdf,
        } = require("../src/services/localDb");
        const pdf = await getLocalPdfById("pdf-1");
        expect(pdf).not.toBeNull();

        await deleteLocalPdf("pdf-1");
        expect(db.runAsync).toHaveBeenCalledWith(
          expect.stringContaining("DELETE"),
          ["pdf-1"],
        );
      });
    });
  });

  describe("savePdfLocally", () => {
    it("saves PDF metadata to localDb", async () => {
      await jest.isolateModulesAsync(async () => {
        const db = mockDb();
        db.runAsync.mockResolvedValue(undefined);
        const SQLite = require("expo-sqlite");
        SQLite.openDatabaseAsync.mockResolvedValue(db);

        const { savePdfLocally } = require("../src/services/localDb");
        await savePdfLocally({
          id: "new-pdf",
          original_filename: "new.pdf",
          file_size: 512,
          page_count: 1,
          uri: "file:///pdfs/new-pdf.pdf",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        });

        expect(db.runAsync).toHaveBeenCalledWith(
          expect.stringContaining("INSERT OR REPLACE"),
          expect.arrayContaining(["new-pdf", "new.pdf"]),
        );
      });
    });
  });
});
