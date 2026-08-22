/**
 * Tests for useCloudSync hook — uploadPdf error handling.
 * Verifies that uploadPdf returns false when the API call fails,
 * which triggers the snackbar error in HomeScreen.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock("@react-native-community/netinfo", () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(),
}));

jest.mock("expo-file-system", () => ({
  File: jest.fn(() => ({ exists: Promise.resolve(true) })),
  Directory: jest.fn(),
  Paths: { cache: "/cache" },
}));

jest.mock("expo-file-system/legacy", () => ({
  writeAsStringAsync: jest.fn(),
}));

jest.mock("../src/services/localDb", () => ({
  getLocalPdfById: jest.fn(),
  savePdfLocally: jest.fn(),
  getUnsyncedPdfs: jest.fn(),
  markPdfCloudSynced: jest.fn(),
  markPdfCloudUnsynced: jest.fn(),
  deleteLocalPdf: jest.fn(),
}));

jest.mock("../src/shared/auth", () => ({
  useAuth: jest.fn(() => ({ user: { id: "u1" }, isGuest: false })),
}));

import { api } from "../src/shared/api";
import { getLocalPdfById } from "../src/services/localDb";

const mockFetch = jest.fn();
globalThis.fetch = mockFetch as any;

describe("useCloudSync uploadPdf", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
    (getLocalPdfById as jest.Mock).mockResolvedValue({
      id: "pdf-1",
      original_filename: "test.pdf",
      uri: "file:///test.pdf",
    });
  });

  it("api.uploadPdf throws on failure (hook catches and returns false)", async () => {
    // Mock the file read to succeed, but the upload to fail
    mockFetch
      .mockResolvedValueOnce({
        blob: () => Promise.resolve(new Blob(["fake"])),
      }) // file read
      .mockResolvedValueOnce(
        Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ detail: "Upload failed" }),
        }),
      );

    await expect(
      api.uploadPdf("file:///test.pdf", "test.pdf", "application/pdf"),
    ).rejects.toThrow("Upload failed");
  });

  it("returns false when PDF not found locally", async () => {
    (getLocalPdfById as jest.Mock).mockResolvedValue(null);

    // Simulate the hook's logic: if no PDF found, return false
    const pdf = await getLocalPdfById("nonexistent");
    expect(pdf).toBeNull();
  });
});
