/**
 * Tests for useCloudSync hook.
 *
 * Covers: state management, uploadPdf, downloadPdf, deletePdf, syncAll,
 * localStorage persistence, online/offline detection, token retry, status loading.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCloudSync } from "../useCloudSync";

// ─── Mocks ────────────────────────────────────────────────────────

const mockApiListPdfs = vi.fn();
const mockApiDownloadPdf = vi.fn();
const mockApiUploadPdf = vi.fn();
const mockApiDeletePdf = vi.fn();
const mockCloudListPdfs = vi.fn();
const mockCloudDownloadPdf = vi.fn();
const mockCloudUploadPdf = vi.fn();
const mockCloudDeletePdf = vi.fn();
const mockCloudGetToken = vi.fn();

vi.mock("../../shared/api", () => ({
  api: {
    listPdfs: (...args: any[]) => mockApiListPdfs(...args),
    downloadPdf: (...args: any[]) => mockApiDownloadPdf(...args),
    uploadPdf: (...args: any[]) => mockApiUploadPdf(...args),
    deletePdf: (...args: any[]) => mockApiDeletePdf(...args),
  },
  cloudApi: {
    listPdfs: (...args: any[]) => mockCloudListPdfs(...args),
    downloadPdf: (...args: any[]) => mockCloudDownloadPdf(...args),
    uploadPdf: (...args: any[]) => mockCloudUploadPdf(...args),
    deletePdf: (...args: any[]) => mockCloudDeletePdf(...args),
    getToken: (...args: any[]) => mockCloudGetToken(...args),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────

function createMockPdf(overrides: Partial<any> = {}) {
  return {
    id: "pdf-" + Math.random().toString(36).slice(2, 8),
    original_filename: "test.pdf",
    file_size: 1000,
    page_count: 5,
    created_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

function clearLocalStorage() {
  const keys = [
    "pdfeditor_cloud_sync_enabled",
    "pdfeditor_cloud_sync_on_startup",
    "pdfeditor_sync_id_map",
  ];
  keys.forEach((k) => localStorage.removeItem(k));
}

// ─── Tests ────────────────────────────────────────────────────────

describe("useCloudSync", () => {
  beforeEach(() => {
    clearLocalStorage();
    // Disable sync-on-startup for most tests to avoid interference
    localStorage.setItem("pdfeditor_cloud_sync_on_startup", "false");
    vi.useRealTimers();
    Object.defineProperty(navigator, "onLine", {
      value: true,
      configurable: true,
    });
    mockCloudGetToken.mockReturnValue("fake-cloud-token");
    mockApiListPdfs.mockResolvedValue({ items: [] });
    mockCloudListPdfs.mockResolvedValue({ items: [] });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Initial state ──────────────────────────────────────────

  it("defaults syncEnabled to true", () => {
    const { result } = renderHook(() => useCloudSync());
    expect(result.current.syncEnabled).toBe(true);
  });

  it("defaults syncOnStartup to true", () => {
    clearLocalStorage();
    const { result } = renderHook(() => useCloudSync());
    expect(result.current.syncOnStartup).toBe(true);
  });

  it("reads syncEnabled from localStorage", () => {
    localStorage.setItem("pdfeditor_cloud_sync_enabled", "false");
    const { result } = renderHook(() => useCloudSync());
    expect(result.current.syncEnabled).toBe(false);
  });

  it("reads syncOnStartup from localStorage", () => {
    clearLocalStorage();
    localStorage.setItem("pdfeditor_cloud_sync_on_startup", "false");
    const { result } = renderHook(() => useCloudSync());
    expect(result.current.syncOnStartup).toBe(false);
  });

  it("initializes with empty status, no progress, not syncing, online", () => {
    const { result } = renderHook(() => useCloudSync());
    expect(result.current.status).toEqual({});
    expect(result.current.progress).toBeNull();
    expect(result.current.isSyncing).toBe(false);
    expect(result.current.isOnline).toBe(true);
    expect(result.current.lastSyncResult).toBeNull();
  });

  // ── setSyncEnabled / setSyncOnStartup ──────────────────────

  it("setSyncEnabled updates state and localStorage", async () => {
    const { result } = renderHook(() => useCloudSync());
    await act(async () => {
      await result.current.setSyncEnabled(false);
    });
    expect(result.current.syncEnabled).toBe(false);
    expect(localStorage.getItem("pdfeditor_cloud_sync_enabled")).toBe("false");
  });

  it("setSyncOnStartup updates state and localStorage", async () => {
    const { result } = renderHook(() => useCloudSync());
    await act(async () => {
      await result.current.setSyncOnStartup(false);
    });
    expect(result.current.syncOnStartup).toBe(false);
    expect(localStorage.getItem("pdfeditor_cloud_sync_on_startup")).toBe(
      "false",
    );
  });

  // ── uploadPdf ──────────────────────────────────────────────

  it("uploadPdf returns 'failed' when sync disabled", async () => {
    localStorage.setItem("pdfeditor_cloud_sync_enabled", "false");
    const { result } = renderHook(() => useCloudSync());
    const res = await result.current.uploadPdf("pdf-1");
    expect(res).toBe("failed");
  });

  it("uploadPdf succeeds and saves mapping", async () => {
    mockApiDownloadPdf.mockResolvedValue(new Blob(["fake-pdf"]));
    mockCloudUploadPdf.mockResolvedValue(createMockPdf({ id: "cloud-1" }));
    const { result } = renderHook(() => useCloudSync());
    const res = await result.current.uploadPdf("pdf-1", "doc.pdf");
    expect(res).toBe("uploaded");
    expect(mockApiDownloadPdf).toHaveBeenCalledWith("pdf-1");
    expect(mockCloudUploadPdf).toHaveBeenCalled();
    const map = JSON.parse(
      localStorage.getItem("pdfeditor_sync_id_map") || "{}",
    );
    expect(map["pdf-1"]).toBe("cloud-1");
    await waitFor(() => {
      expect(result.current.status["pdf-1"]).toBe("synced");
    });
  });

  it("uploadPdf skips locked PDFs", async () => {
    mockApiDownloadPdf.mockRejectedValue(new Error("password required"));
    const { result } = renderHook(() => useCloudSync());
    let res;
    await act(async () => {
      res = await result.current.uploadPdf("pdf-1", "locked.pdf");
    });
    expect(res).toBe("skipped");
  });

  it("uploadPdf returns 'failed' on other errors", async () => {
    mockApiDownloadPdf.mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useCloudSync());
    let res;
    await act(async () => {
      res = await result.current.uploadPdf("pdf-1", "broken.pdf");
    });
    expect(res).toBe("failed");
  });

  // ── downloadPdf ────────────────────────────────────────────

  it("downloadPdf returns false when sync disabled", async () => {
    localStorage.setItem("pdfeditor_cloud_sync_enabled", "false");
    const { result } = renderHook(() => useCloudSync());
    const res = await result.current.downloadPdf("cloud-1");
    expect(res).toBe(false);
  });

  it("downloadPdf succeeds and saves mapping", async () => {
    mockCloudDownloadPdf.mockResolvedValue(new Blob(["fake-pdf"]));
    mockApiUploadPdf.mockResolvedValue(createMockPdf({ id: "local-1" }));
    const { result } = renderHook(() => useCloudSync());
    const res = await result.current.downloadPdf("cloud-1", "doc.pdf");
    expect(res).toBe(true);
    expect(mockCloudDownloadPdf).toHaveBeenCalledWith("cloud-1");
    expect(mockApiUploadPdf).toHaveBeenCalled();
    const map = JSON.parse(
      localStorage.getItem("pdfeditor_sync_id_map") || "{}",
    );
    expect(map["local-1"]).toBe("cloud-1");
    await waitFor(() => {
      expect(result.current.status["local-1"]).toBe("synced");
    });
  });

  it("downloadPdf returns false on error", async () => {
    mockCloudDownloadPdf.mockRejectedValue(new Error("Not found"));
    const { result } = renderHook(() => useCloudSync());
    let res;
    await act(async () => {
      res = await result.current.downloadPdf("cloud-1");
    });
    expect(res).toBe(false);
  });

  // ── deletePdf ──────────────────────────────────────────────

  it("deletePdf deletes from both by default", async () => {
    localStorage.setItem(
      "pdfeditor_sync_id_map",
      JSON.stringify({ "local-1": "cloud-1" }),
    );
    mockCloudDeletePdf.mockResolvedValue(undefined);
    mockApiDeletePdf.mockResolvedValue(undefined);
    const { result } = renderHook(() => useCloudSync());
    const res = await result.current.deletePdf("local-1");
    expect(res).toBe(true);
    expect(mockCloudDeletePdf).toHaveBeenCalledWith("cloud-1");
    expect(mockApiDeletePdf).toHaveBeenCalledWith("local-1");
    const map = JSON.parse(
      localStorage.getItem("pdfeditor_sync_id_map") || "{}",
    );
    expect(map["local-1"]).toBeUndefined();
  });

  it("deletePdf deletes from cloud only", async () => {
    localStorage.setItem(
      "pdfeditor_sync_id_map",
      JSON.stringify({ "local-1": "cloud-1" }),
    );
    mockCloudDeletePdf.mockResolvedValue(undefined);
    const { result } = renderHook(() => useCloudSync());
    const res = await result.current.deletePdf("local-1", "cloud");
    expect(res).toBe(true);
    expect(mockCloudDeletePdf).toHaveBeenCalledWith("cloud-1");
    expect(mockApiDeletePdf).not.toHaveBeenCalled();
  });

  it("deletePdf deletes from local only", async () => {
    localStorage.setItem(
      "pdfeditor_sync_id_map",
      JSON.stringify({ "local-1": "cloud-1" }),
    );
    mockApiDeletePdf.mockResolvedValue(undefined);
    const { result } = renderHook(() => useCloudSync());
    const res = await result.current.deletePdf("local-1", "local");
    expect(res).toBe(true);
    expect(mockCloudDeletePdf).not.toHaveBeenCalled();
    expect(mockApiDeletePdf).toHaveBeenCalledWith("local-1");
  });

  it("deletePdf handles cloud delete failure gracefully", async () => {
    localStorage.setItem(
      "pdfeditor_sync_id_map",
      JSON.stringify({ "local-1": "cloud-1" }),
    );
    mockCloudDeletePdf.mockRejectedValue(new Error("Cloud error"));
    mockApiDeletePdf.mockResolvedValue(undefined);
    const { result } = renderHook(() => useCloudSync());
    const res = await result.current.deletePdf("local-1", "both");
    expect(res).toBe(true);
    const map = JSON.parse(
      localStorage.getItem("pdfeditor_sync_id_map") || "{}",
    );
    expect(map["local-1"]).toBeUndefined();
  });

  it("deletePdf handles local delete failure gracefully", async () => {
    localStorage.setItem(
      "pdfeditor_sync_id_map",
      JSON.stringify({ "local-1": "cloud-1" }),
    );
    mockCloudDeletePdf.mockResolvedValue(undefined);
    mockApiDeletePdf.mockRejectedValue(new Error("Local error"));
    const { result } = renderHook(() => useCloudSync());
    const res = await result.current.deletePdf("local-1", "both");
    expect(res).toBe(true);
  });

  it("deletePdf returns false on unexpected error", async () => {
    // Simulate localStorage.setItem throwing (e.g., quota exceeded)
    const origSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(() => {
      throw new Error("Quota exceeded");
    });
    const { result } = renderHook(() => useCloudSync());
    const res = await result.current.deletePdf("local-1");
    expect(res).toBe(false);
    Storage.prototype.setItem = origSetItem;
  });

  // ── syncAll ────────────────────────────────────────────────

  it("syncAll returns early when sync disabled", async () => {
    localStorage.setItem("pdfeditor_cloud_sync_enabled", "false");
    const { result } = renderHook(() => useCloudSync());
    const res = await result.current.syncAll();
    expect(res.errors).toContain("Sync disabled or already in progress");
  });

  it("syncAll returns early when already syncing", async () => {
    mockApiListPdfs.mockImplementation(
      () => new Promise((r) => setTimeout(r, 10000)),
    );
    const { result } = renderHook(() => useCloudSync());
    result.current.syncAll();
    const res = await result.current.syncAll();
    expect(res.errors).toContain("Sync disabled or already in progress");
    mockApiListPdfs.mockResolvedValue({ items: [] });
  });

  it("syncAll uploads local PDFs not in cloud", async () => {
    const localPdf = createMockPdf({
      id: "local-1",
      original_filename: "doc1.pdf",
    });
    mockApiListPdfs.mockResolvedValue({ items: [localPdf] });
    mockCloudListPdfs.mockResolvedValue({ items: [] });
    mockApiDownloadPdf.mockResolvedValue(new Blob(["fake"]));
    mockCloudUploadPdf.mockResolvedValue(createMockPdf({ id: "cloud-1" }));
    const { result } = renderHook(() => useCloudSync());
    const res = await result.current.syncAll();
    expect(res.uploaded).toBe(1);
    expect(res.downloaded).toBe(0);
    expect(mockCloudUploadPdf).toHaveBeenCalled();
  });

  it("syncAll downloads cloud PDFs not in local", async () => {
    const cloudPdf = createMockPdf({
      id: "cloud-1",
      original_filename: "doc1.pdf",
    });
    mockApiListPdfs.mockResolvedValue({ items: [] });
    mockCloudListPdfs.mockResolvedValue({ items: [cloudPdf] });
    mockCloudDownloadPdf.mockResolvedValue(new Blob(["fake"]));
    mockApiUploadPdf.mockResolvedValue(createMockPdf({ id: "local-1" }));
    const { result } = renderHook(() => useCloudSync());
    const res = await result.current.syncAll();
    expect(res.downloaded).toBe(1);
    expect(res.uploaded).toBe(0);
    expect(mockCloudDownloadPdf).toHaveBeenCalled();
  });

  it("syncAll skips already synced PDFs", async () => {
    const localPdf = createMockPdf({
      id: "local-1",
      original_filename: "doc1.pdf",
    });
    const cloudPdf = createMockPdf({
      id: "cloud-1",
      original_filename: "doc1.pdf",
    });
    localStorage.setItem(
      "pdfeditor_sync_id_map",
      JSON.stringify({ "local-1": "cloud-1" }),
    );
    mockApiListPdfs.mockResolvedValue({ items: [localPdf] });
    mockCloudListPdfs.mockResolvedValue({ items: [cloudPdf] });
    const { result } = renderHook(() => useCloudSync());
    const res = await result.current.syncAll();
    expect(res.uploaded).toBe(0);
    expect(res.downloaded).toBe(0);
    expect(res.skipped).toBe(0);
  });

  it("syncAll matches by filename for pre-mapping", async () => {
    const localPdf = createMockPdf({
      id: "local-1",
      original_filename: "same.pdf",
    });
    const cloudPdf = createMockPdf({
      id: "cloud-1",
      original_filename: "same.pdf",
    });
    mockApiListPdfs.mockResolvedValue({ items: [localPdf] });
    mockCloudListPdfs.mockResolvedValue({ items: [cloudPdf] });
    const { result } = renderHook(() => useCloudSync());
    const res = await result.current.syncAll();
    // Upload loop skips (filename match), download loop sees mapping already saved → 0
    expect(res.skipped).toBe(1);
    const map = JSON.parse(
      localStorage.getItem("pdfeditor_sync_id_map") || "{}",
    );
    expect(map["local-1"]).toBe("cloud-1");
  });

  it("syncAll reports errors", async () => {
    const localPdf = createMockPdf({
      id: "local-1",
      original_filename: "err.pdf",
    });
    mockApiListPdfs.mockResolvedValue({ items: [localPdf] });
    mockCloudListPdfs.mockResolvedValue({ items: [] });
    mockApiDownloadPdf.mockRejectedValue(new Error("Download failed"));
    const { result } = renderHook(() => useCloudSync());
    const res = await result.current.syncAll();
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors[0]).toContain("err.pdf");
  });

  // ── Online/offline ─────────────────────────────────────────

  it("detects online status", () => {
    const { result } = renderHook(() => useCloudSync());
    expect(result.current.isOnline).toBe(true);
  });

  it("detects offline status", () => {
    Object.defineProperty(navigator, "onLine", {
      value: false,
      configurable: true,
    });
    const { result } = renderHook(() => useCloudSync());
    expect(result.current.isOnline).toBe(false);
  });

  it("reacts to online event", () => {
    const { result } = renderHook(() => useCloudSync());
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current.isOnline).toBe(true);
  });

  it("reacts to offline event", () => {
    const { result } = renderHook(() => useCloudSync());
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current.isOnline).toBe(false);
  });

  // ── clearSyncResult ────────────────────────────────────────

  it("clearSyncResult resets lastSyncResult", () => {
    const { result } = renderHook(() => useCloudSync());
    act(() => {
      result.current.clearSyncResult();
    });
    expect(result.current.lastSyncResult).toBeNull();
  });

  // ── refreshStatus ──────────────────────────────────────────

  it("refreshStatus dispatches custom event", async () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    mockApiListPdfs.mockResolvedValue({ items: [] });
    mockCloudListPdfs.mockResolvedValue({ items: [] });
    const { result } = renderHook(() => useCloudSync());
    await act(async () => {
      await result.current.refreshStatus();
    });
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: "pdfeditor-sync-status-changed" }),
    );
  });

  // ── Status loading ─────────────────────────────────────────

  it("loadStatus marks synced PDFs correctly", async () => {
    const localPdf = createMockPdf({ id: "local-1" });
    const cloudPdf = createMockPdf({ id: "cloud-1" });
    localStorage.setItem(
      "pdfeditor_sync_id_map",
      JSON.stringify({ "local-1": "cloud-1" }),
    );
    mockApiListPdfs.mockResolvedValue({ items: [localPdf] });
    mockCloudListPdfs.mockResolvedValue({ items: [cloudPdf] });
    const { result } = renderHook(() => useCloudSync());
    await waitFor(() => {
      expect(result.current.status["local-1"]).toBe("synced");
    });
  });

  it("loadStatus marks non-synced PDFs as none", async () => {
    const localPdf = createMockPdf({ id: "local-1" });
    mockApiListPdfs.mockResolvedValue({ items: [localPdf] });
    mockCloudListPdfs.mockResolvedValue({ items: [] });
    const { result } = renderHook(() => useCloudSync());
    await waitFor(() => {
      expect(result.current.status["local-1"]).toBe("none");
    });
  });

  it("loadStatus does nothing when sync disabled", async () => {
    localStorage.setItem("pdfeditor_cloud_sync_enabled", "false");
    mockApiListPdfs.mockResolvedValue({ items: [] });
    mockCloudListPdfs.mockResolvedValue({ items: [] });
    const { result } = renderHook(() => useCloudSync());
    expect(result.current.syncEnabled).toBe(false);
    expect(mockApiListPdfs).not.toHaveBeenCalled();
  });

  // ── Token retry ────────────────────────────────────────────

  it("retries getting cloud token up to 10 times", async () => {
    vi.useFakeTimers();
    clearLocalStorage();
    localStorage.setItem("pdfeditor_cloud_sync_on_startup", "false");
    mockCloudGetToken
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce("token-after-retry");
    mockApiListPdfs.mockResolvedValue({ items: [] });
    mockCloudListPdfs.mockResolvedValue({ items: [] });
    renderHook(() => useCloudSync());
    for (let i = 0; i < 10; i++) {
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
    }
    expect(mockCloudGetToken).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it("gives up after 10 failed token retries", async () => {
    vi.useFakeTimers();
    clearLocalStorage();
    localStorage.setItem("pdfeditor_cloud_sync_on_startup", "false");
    mockCloudGetToken.mockReturnValue(null);
    mockApiListPdfs.mockResolvedValue({ items: [] });
    mockCloudListPdfs.mockResolvedValue({ items: [] });
    renderHook(() => useCloudSync());
    for (let i = 0; i < 10; i++) {
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
    }
    expect(mockCloudGetToken).toHaveBeenCalledTimes(11);
    expect(mockApiListPdfs).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  // ── Event listener cleanup ─────────────────────────────────

  it("removes event listeners on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useCloudSync());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("online", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("offline", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith(
      "pdfeditor-sync-status-changed",
      expect.any(Function),
    );
  });
});
