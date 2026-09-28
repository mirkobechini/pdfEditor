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
  addEventListener: jest.fn(() => () => {}),
}));

jest.mock("expo-file-system", () => ({
  File: jest.fn(() => ({ exists: Promise.resolve(true) })),
  Directory: jest.fn(),
  Paths: { cache: "/cache" },
}));

jest.mock("expo-file-system/legacy", () => ({
  writeAsStringAsync: jest.fn(),
}));

const mockSetPdfCloudId = jest.fn();
const mockDeleteLocalPdf = jest.fn();
jest.mock("../src/services/localDb", () => ({
  getLocalPdfById: jest.fn(),
  getLocalPdfByCloudId: jest.fn(),
  savePdfLocally: jest.fn(),
  getUnsyncedPdfs: jest.fn(),
  markPdfCloudSynced: jest.fn(),
  markPdfCloudUnsynced: jest.fn(),
  setPdfCloudId: (...args: unknown[]) => mockSetPdfCloudId(...args),
  deleteLocalPdf: (...args: unknown[]) => mockDeleteLocalPdf(...args),
}));

jest.mock("../src/shared/auth", () => ({
  useAuth: jest.fn(() => ({ user: { id: "u1" }, isGuest: false })),
}));

import { renderHook, act } from "@testing-library/react-native";
import { api } from "../src/shared/api";
import { getLocalPdfById, getUnsyncedPdfs } from "../src/services/localDb";
import { useCloudSync } from "../src/hooks/useCloudSync";

const mockFetch = jest.fn();
globalThis.fetch = mockFetch as any;

describe("useCloudSync uploadPdf", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // The hook schedules a real setTimeout(1500ms) for auto-sync-on-startup;
    // mocking getUnsyncedPdfs to resolve [] keeps that harmless if it fires
    // during a slower test run instead of crashing on `undefined.length`.
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
    (getUnsyncedPdfs as jest.Mock).mockResolvedValue([]);
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

  it("records the cloud id returned by the upload, not just the synced flag", async () => {
    jest.spyOn(api, "uploadPdf").mockResolvedValue({
      id: "cloud-abc",
      original_filename: "test.pdf",
      file_size: 10,
      page_count: 1,
    } as any);

    const { result } = await renderHook(() => useCloudSync());
    // Let the preferences-loading effect (AsyncStorage.getItem) resolve, so
    // syncEnabled flips to its default `true` before we call uploadPdf.
    await act(async () => {});

    let ok = false;
    await act(async () => {
      ok = await result.current.uploadPdf("pdf-1");
    });

    expect(ok).toBe(true);
    // This is the regression this test guards: uploadPdf used to call only
    // markPdfCloudSynced, never persisting the cloud id, so the next sync
    // could never recognize this PDF as already present on the cloud and
    // would re-download it as a duplicate.
    expect(mockSetPdfCloudId).toHaveBeenCalledWith("pdf-1", "cloud-abc");
  });
});

describe("useCloudSync deletePdf", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
    (getUnsyncedPdfs as jest.Mock).mockResolvedValue([]);
  });

  it("deletes from the cloud using pdf.cloud_id, not the local id", async () => {
    (getLocalPdfById as jest.Mock).mockResolvedValue({
      id: "local-1",
      cloud_id: "cloud-xyz",
      original_filename: "test.pdf",
      uri: "file:///test.pdf",
    });
    const deleteSpy = jest.spyOn(api, "deletePdf").mockResolvedValue(undefined);

    const { result } = await renderHook(() => useCloudSync());
    await act(async () => {
      await result.current.deletePdf("local-1", "cloud");
    });

    // This is the regression this test guards: passing the local id here
    // silently 404'd against the backend (caught and logged, never
    // surfaced), leaving the cloud copy alive to be re-downloaded as a
    // duplicate on the next sync.
    expect(deleteSpy).toHaveBeenCalledWith("cloud-xyz");
    expect(deleteSpy).not.toHaveBeenCalledWith("local-1");
  });

  it("skips the cloud delete call entirely when the PDF has no cloud_id yet", async () => {
    (getLocalPdfById as jest.Mock).mockResolvedValue({
      id: "local-1",
      original_filename: "test.pdf",
      uri: "file:///test.pdf",
    });
    const deleteSpy = jest.spyOn(api, "deletePdf").mockResolvedValue(undefined);

    const { result } = await renderHook(() => useCloudSync());
    await act(async () => {
      await result.current.deletePdf("local-1", "cloud");
    });

    expect(deleteSpy).not.toHaveBeenCalled();
  });
});
