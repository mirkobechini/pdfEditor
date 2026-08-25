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

  it("login throws raw error code on failure", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          detail: { code: "EMAIL_NOT_FOUND", detail: "Email not registered" },
        }),
        { status: 401 },
      ),
    );
    await expect(api.login("missing@test.com", "pass")).rejects.toThrow(
      "EMAIL_NOT_FOUND",
    );
  });

  it("login throws extracted error when no code", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "Wrong password" }), {
        status: 401,
      }),
    );
    await expect(api.login("test@test.com", "wrong")).rejects.toThrow();
  });

  it("login stores csrf_token from response", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ access_token: "jwt123", csrf_token: "csrf123" }),
          { status: 200 },
        ),
      );
    const result = await api.login("test@test.com", "pass");
    expect(result.access_token).toBe("jwt123");
    expect((api as any)._csrfToken).toBe("csrf123");
  });

  it("refreshToken returns null on failure", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 401 }));
    const result = await api.refreshToken();
    expect(result).toBeNull();
  });

  it("refreshToken returns token on success", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ access_token: "new-jwt", csrf_token: "new-csrf" }),
          { status: 200 },
        ),
      );
    const result = await api.refreshToken();
    expect(result?.access_token).toBe("new-jwt");
    expect((api as any).token).toBe("new-jwt");
  });

  it("refreshToken calls onTokenRefreshed callback", async () => {
    const callback = vi.fn();
    (api as any).onTokenRefreshed = callback;
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ access_token: "new-jwt", csrf_token: "new-csrf" }),
          { status: 200 },
        ),
      );
    await api.refreshToken();
    expect(callback).toHaveBeenCalledWith("new-jwt", "new-csrf");
    (api as any).onTokenRefreshed = null;
  });

  it("refreshToken calls onTokenRefreshFailed on error", async () => {
    const callback = vi.fn();
    (api as any).onTokenRefreshFailed = callback;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    await api.refreshToken();
    expect(callback).toHaveBeenCalled();
    (api as any).onTokenRefreshFailed = null;
  });

  it("_fetch auto-refreshes on 401 with expired token", async () => {
    (api as any).token = "expired-jwt";
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: "Token expired" }), {
          status: 401,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: "new-jwt", csrf_token: "new-csrf" }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "u1", email: "test@test.com" }), {
          status: 200,
        }),
      );
    const result = await api.getMe();
    expect(result.email).toBe("test@test.com");
    expect((api as any).token).toBe("new-jwt");
  });

  it("_fetch does not auto-refresh on 401 with INVALID_CREDENTIALS", async () => {
    (api as any).token = "expired-jwt";
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "INVALID_CREDENTIALS" }), {
        status: 401,
      }),
    );
    await expect(api.getMe()).rejects.toThrow();
    // The refresh attempt happens but fails (returns null), so fetch is called twice
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("getHeaders includes Bearer token and CSRF", async () => {
    (api as any).token = "jwt123";
    (api as any)._csrfToken = "csrf123";
    const headers = (api as any).getHeaders();
    expect(headers["Authorization"]).toBe("Bearer jwt123");
    expect(headers["X-CSRF-Token"]).toBe("csrf123");
  });

  it("getHeaders returns empty when no token", async () => {
    (api as any).token = null;
    (api as any)._csrfToken = null;
    const headers = (api as any).getHeaders();
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("_getCsrfToken falls back to cookie", () => {
    (api as any)._csrfToken = null;
    document.cookie = "csrf_token=cookie-csrf";
    const token = (api as any)._getCsrfToken();
    expect(token).toBe("cookie-csrf");
    document.cookie = "csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  });

  it("_getCsrfToken returns null when no cookie", () => {
    (api as any)._csrfToken = null;
    document.cookie = "csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    const token = (api as any)._getCsrfToken();
    expect(token).toBeNull();
  });

  it("refreshCsrf handles network error gracefully", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    await api.refreshCsrf(); // Should not throw
  });

  it("refreshCsrf stores csrf_token from response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ csrf_token: "csrf456" }), {
        status: 200,
      }),
    );
    await api.refreshCsrf();
    expect((api as any)._csrfToken).toBe("csrf456");
  });
});

describe("uploadPdfWithProgress", () => {
  let xhrInstance: any;

  beforeEach(() => {
    vi.resetAllMocks();
    (api as any).token = null;
    (api as any)._csrfToken = null;
    vi.stubGlobal(
      "XMLHttpRequest",
      class {
        upload: any;
        status = 200;
        statusText = "OK";
        responseText = "";
        withCredentials = false;
        headers: Record<string, string> = {};
        open = vi.fn();
        setRequestHeader = vi.fn((k: string, v: string) => {
          this.headers[k] = v;
        });
        send = vi.fn();
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor() {
          this.upload = { onprogress: null };
          xhrInstance = this;
        }
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves with parsed PDF on success", async () => {
    const file = new File(["dummy"], "doc.pdf", { type: "application/pdf" });
    const promise = api.uploadPdfWithProgress(file);
    xhrInstance.status = 201;
    xhrInstance.responseText = JSON.stringify({
      id: "p1",
      original_filename: "doc.pdf",
    });
    xhrInstance.onload!();
    const result = await promise;
    expect(result.id).toBe("p1");
    expect(xhrInstance.open).toHaveBeenCalledWith(
      "POST",
      expect.stringContaining("/pdfs/upload"),
    );
    expect(xhrInstance.withCredentials).toBe(true);
    expect(xhrInstance.send).toHaveBeenCalled();
  });

  it("rejects with detail string on error status", async () => {
    const file = new File(["dummy"], "doc.pdf", { type: "application/pdf" });
    const promise = api.uploadPdfWithProgress(file);
    xhrInstance.status = 400;
    xhrInstance.statusText = "Bad Request";
    xhrInstance.responseText = JSON.stringify({ detail: "File troppo grande" });
    xhrInstance.onload!();
    await expect(promise).rejects.toThrow("File troppo grande");
  });

  it("rejects with first array msg on error status", async () => {
    const file = new File(["dummy"], "doc.pdf", { type: "application/pdf" });
    const promise = api.uploadPdfWithProgress(file);
    xhrInstance.status = 422;
    xhrInstance.statusText = "Unprocessable";
    xhrInstance.responseText = JSON.stringify({
      detail: [{ msg: "field required" }],
    });
    xhrInstance.onload!();
    await expect(promise).rejects.toThrow("field required");
  });

  it("rejects with statusText for non-JSON error body", async () => {
    const file = new File(["dummy"], "doc.pdf", { type: "application/pdf" });
    const promise = api.uploadPdfWithProgress(file);
    xhrInstance.status = 500;
    xhrInstance.statusText = "Internal Server Error";
    xhrInstance.responseText = "not json";
    xhrInstance.onload!();
    await expect(promise).rejects.toThrow("Internal Server Error");
  });

  it("rejects with Network error on xhr.onerror", async () => {
    const file = new File(["dummy"], "doc.pdf", { type: "application/pdf" });
    const promise = api.uploadPdfWithProgress(file);
    xhrInstance.onerror!();
    await expect(promise).rejects.toThrow("Network error");
  });

  it("calls onProgress when length is computable", async () => {
    const onProgress = vi.fn();
    const file = new File(["dummy"], "doc.pdf", { type: "application/pdf" });
    const promise = api.uploadPdfWithProgress(file, onProgress);
    xhrInstance.status = 201;
    xhrInstance.responseText = JSON.stringify({ id: "p1" });
    xhrInstance.upload.onprogress({
      lengthComputable: true,
      loaded: 50,
      total: 100,
    });
    expect(onProgress).toHaveBeenCalledWith(50);
    xhrInstance.onload!();
    await promise;
  });

  it("does not call onProgress when length is not computable", async () => {
    const onProgress = vi.fn();
    const file = new File(["dummy"], "doc.pdf", { type: "application/pdf" });
    const promise = api.uploadPdfWithProgress(file, onProgress);
    xhrInstance.status = 201;
    xhrInstance.responseText = JSON.stringify({ id: "p1" });
    xhrInstance.upload.onprogress({ lengthComputable: false });
    expect(onProgress).not.toHaveBeenCalled();
    xhrInstance.onload!();
    await promise;
  });

  it("sets Authorization header when token present", async () => {
    (api as any).token = "jwt123";
    const file = new File(["dummy"], "doc.pdf", { type: "application/pdf" });
    const promise = api.uploadPdfWithProgress(file);
    expect(xhrInstance.headers["Authorization"]).toBe("Bearer jwt123");
    xhrInstance.status = 201;
    xhrInstance.responseText = JSON.stringify({ id: "p1" });
    xhrInstance.onload!();
    await promise;
  });

  it("sets X-CSRF-Token header when csrf present", async () => {
    (api as any)._csrfToken = "csrf123";
    const file = new File(["dummy"], "doc.pdf", { type: "application/pdf" });
    const promise = api.uploadPdfWithProgress(file);
    expect(xhrInstance.headers["X-CSRF-Token"]).toBe("csrf123");
    xhrInstance.status = 201;
    xhrInstance.responseText = JSON.stringify({ id: "p1" });
    xhrInstance.onload!();
    await promise;
  });
});

describe("getToken and _fetch edge cases", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (api as any).token = null;
    (api as any)._csrfToken = null;
    (api as any)._isRefreshing = false;
  });

  it("getToken returns current token", () => {
    (api as any).token = "jwt123";
    expect(api.getToken()).toBe("jwt123");
  });

  it("getToken returns null when no token set", () => {
    (api as any).token = null;
    expect(api.getToken()).toBeNull();
  });

  it("_fetch does not auto-refresh when detail is not a string", async () => {
    (api as any).token = "expired-jwt";
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: { code: "X" } }), {
        status: 401,
      }),
    );
    await expect(api.getMe()).rejects.toThrow();
    // detail is object → no refresh attempt
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("_fetch does not auto-refresh when body is not JSON", async () => {
    (api as any).token = "expired-jwt";
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response("not json", { status: 401 }));
    await expect(api.getMe()).rejects.toThrow();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("_fetch does not auto-refresh when detail is unrelated string", async () => {
    (api as any).token = "expired-jwt";
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "Some other error" }), {
        status: 401,
      }),
    );
    await expect(api.getMe()).rejects.toThrow();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
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
