import { describe, it, expect, vi } from "vitest";
import { ApiClient, api, startKeepWarm, stopKeepWarm } from "../api";

// Copy of the class for testing static methods
const Client = ApiClient;

describe("ApiClient.extractError", () => {
  it("extracts detail string from JSON response", async () => {
    const res = new Response(
      JSON.stringify({ detail: "Email already registered" }),
      { status: 400 },
    );
    const error = await Client.extractError(res);
    expect(error).toBe("Email already registered");
  });

  it("extracts first error msg from array", async () => {
    const res = new Response(
      JSON.stringify({ detail: [{ msg: "field required" }] }),
      { status: 422 },
    );
    const error = await Client.extractError(res);
    expect(error).toBe("field required");
  });

  it("falls back to statusText for non-JSON", async () => {
    const res = new Response("not json", {
      status: 500,
      statusText: "Internal Server Error",
    });
    const error = await Client.extractError(res);
    expect(error).toBe("Internal Server Error");
  });

  it("handles empty detail gracefully", async () => {
    const res = new Response(JSON.stringify({}), { status: 400 });
    const error = await Client.extractError(res);
    expect(error).toBe("{}");
  });

  it("returns rate limit message for 429 status", async () => {
    const res = new Response(JSON.stringify({ detail: "Too many requests" }), {
      status: 429,
    });
    const error = await Client.extractError(res);
    expect(error).toContain("Troppe richieste");
  });

  it("translates INVALID_CREDENTIALS to Italian", async () => {
    const res = new Response(
      JSON.stringify({
        detail: { code: "INVALID_CREDENTIALS", detail: "Incorrect password" },
      }),
      { status: 403 },
    );
    const error = await Client.extractError(res);
    expect(error).toBe("Password errata");
  });

  it("translates PDF_LOCKED to Italian", async () => {
    const res = new Response(
      JSON.stringify({
        detail: { code: "PDF_LOCKED", detail: "PDF is locked" },
      }),
      { status: 403 },
    );
    const error = await Client.extractError(res);
    expect(error).toContain("protetto da password");
  });
});

describe("ApiClient CRUD operations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (api as any).token = null;
    (api as any)._csrfToken = null;
  });

  it("listPdfs fetches and returns items", async () => {
    const mockItems = [{ id: "1", original_filename: "test.pdf" }];
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: mockItems, total: 1 }), {
        status: 200,
      }),
    );
    const result = await api.listPdfs();
    expect(result.items).toEqual(mockItems);
  });

  it("login sends POST and returns user", async () => {
    const mockUser = { id: "u1", email: "test@test.com" };
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(mockUser), { status: 200 }),
      );
    const result = await api.login("test@test.com", "pass123");
    expect(result).toEqual(mockUser);
  });

  it("register sends POST and returns user", async () => {
    const mockUser = { id: "u1", email: "new@test.com" };
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(mockUser), { status: 201 }),
      );
    const result = await api.register("new@test.com", "pass123");
    expect(result).toEqual(mockUser);
  });

  it("getMe returns user", async () => {
    const mockUser = { id: "u1", email: "test@test.com" };
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(mockUser), { status: 200 }),
      );
    const result = await api.getMe();
    expect(result).toEqual(mockUser);
  });

  it("logout sends POST", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    await api.logout();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/logout"),
      expect.any(Object),
    );
  });

  it("uploadPdf sends FormData and returns PdfDocument", async () => {
    const mockPdf = { id: "p1", original_filename: "doc.pdf" };
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(mockPdf), { status: 201 }),
      );
    const file = new File(["dummy"], "doc.pdf", { type: "application/pdf" });
    const result = await api.uploadPdf(file);
    expect(result).toEqual(mockPdf);
  });

  it("downloadPdf returns blob", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response("%PDF-content", { status: 200 }));
    const result = await api.downloadPdf("p1");
    expect(result).toBeTruthy();
  });

  it("deletePdf sends DELETE", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    await api.deletePdf("p1");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/pdfs/p1"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("mergePdfs sends POST with ids", async () => {
    const mockResult = { id: "merged", original_filename: "merged.pdf" };
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(mockResult), { status: 201 }),
      );
    const result = await api.mergePdfs(["p1", "p2"], "merged.pdf");
    expect(result).toEqual(mockResult);
  });

  it("splitPdf sends POST with mode and ranges", async () => {
    const mockResult = { items: [{ id: "s1" }, { id: "s2" }] };
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(mockResult), { status: 200 }),
      );
    const result = await api.splitPdf("p1", "range", ["1-3", "4-5"]);
    expect(result).toEqual(mockResult);
  });

  it("reorderPages sends POST with page order", async () => {
    const mockResult = { id: "p1", original_filename: "reordered.pdf" };
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(mockResult), { status: 200 }),
      );
    const result = await api.reorderPages("p1", [2, 1, 3]);
    expect(result).toEqual(mockResult);
  });

  it("removePages sends POST with page numbers", async () => {
    const mockResult = { id: "p1", original_filename: "removed.pdf" };
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(mockResult), { status: 200 }),
      );
    const result = await api.removePages("p1", [1, 3]);
    expect(result).toEqual(mockResult);
  });

  it("protectPdf sends POST with password", async () => {
    const mockResult = { id: "p1", is_password_protected: true };
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(mockResult), { status: 200 }),
      );
    const result = await api.protectPdf("p1", "mypass");
    expect(result.is_password_protected).toBe(true);
  });

  it("unlockPdf sends POST with password", async () => {
    const mockResult = { id: "p1", is_password_protected: true };
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(mockResult), { status: 200 }),
      );
    const result = await api.unlockPdf("p1", "mypass");
    expect(result.id).toBe("p1");
  });

  it("updateMetadata sends PATCH with updates", async () => {
    const mockResult = { id: "p1" };
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(mockResult), { status: 200 }),
      );
    const result = await api.updateMetadata("p1", { title: "New Title" });
    expect(result).toEqual(mockResult);
  });

  it("exportPdf returns blob", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response("text-content", { status: 200 }));
    const result = await api.exportPdf("p1", "txt");
    expect(result).toBeTruthy();
  });

  it("refreshCsrf fetches CSRF token", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 200,
        headers: new Headers({ "x-csrf-token": "csrf123" }),
      }),
    );
    await api.refreshCsrf();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/csrf"),
      expect.any(Object),
    );
  });

  it("throws on error response", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ detail: "Not found" }), { status: 404 }),
      );
    await expect(api.deletePdf("nonexistent")).rejects.toThrow("Not found");
  });
});

describe("keepWarm", () => {
  it("startKeepWarm pings /health immediately", () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));
    globalThis.fetch = mockFetch as any;
    startKeepWarm();
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/health"));
    stopKeepWarm();
    vi.restoreAllMocks();
  });

  it("startKeepWarm pings /health every 5 minutes", () => {
    vi.useFakeTimers();
    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));
    globalThis.fetch = mockFetch as any;
    startKeepWarm();
    vi.advanceTimersByTime(5 * 60 * 1000);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    stopKeepWarm();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("stopKeepWarm clears the interval", () => {
    vi.useFakeTimers();
    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));
    globalThis.fetch = mockFetch as any;
    startKeepWarm();
    stopKeepWarm();
    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("startKeepWarm does not start duplicate timers", () => {
    vi.useFakeTimers();
    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));
    globalThis.fetch = mockFetch as any;
    startKeepWarm();
    startKeepWarm();
    vi.advanceTimersByTime(5 * 60 * 1000);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    stopKeepWarm();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("ignores network errors silently", async () => {
    vi.useFakeTimers();
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    globalThis.fetch = mockFetch as any;
    startKeepWarm();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(mockFetch).toHaveBeenCalled();
    stopKeepWarm();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
});
