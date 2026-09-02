/**
 * Comprehensive tests for ApiClient PDF operations and remaining branches.
 * Covers lines that appear uncovered in aggregated V8 coverage.
 */
import { ApiClient } from "../src/shared/api";

// Mock global fetch
const mockFetch = jest.fn();
globalThis.fetch = mockFetch as any;

const BASE = "https://pdfeditor-api.mirkobechini.com";

const pdfDoc = {
  id: "p1",
  original_filename: "doc.pdf",
  file_size: 100,
  page_count: 1,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function mockResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? "Not Found" : "OK",
    json: () => Promise.resolve(data),
    blob: () => Promise.resolve(new Blob(["pdf"])),
    clone: () => ({
      json: () => Promise.resolve(data),
    }),
  });
}

describe("ApiClient - comprehensive PDF and error branches", () => {
  let client: ApiClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new ApiClient();
    client.setToken("t");
    client.setCsrfToken("c");
  });

  // ─── extractErrorResponse branch: JSON.stringify body (80) ─────

  it("extractErrorResponse returns JSON.stringify for non-detail object", async () => {
    const res = {
      status: 400,
      statusText: "Bad Request",
      json: () => Promise.resolve({ unexpected: true }),
    };
    expect(await ApiClient.extractErrorResponse(res as any)).toBe(
      '{"unexpected":true}',
    );
  });

  it("extractErrorResponse returns body.code+body.detail path", async () => {
    const res = {
      status: 400,
      statusText: "Bad Request",
      json: () => Promise.resolve({ code: "E1", detail: "Some detail" }),
    };
    expect(await ApiClient.extractErrorResponse(res as any)).toBe(
      "Some detail",
    );
  });

  // ─── register with csrf (184-186) ───────────────────────────────

  it("register sets csrf_token from response", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ access_token: "t2", csrf_token: "c2" }),
    );
    await client.register("a@b.com", "pw", "Alice");
    expect((client as any)._csrfToken).toBe("c2");
  });

  it("register throws on error", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ detail: "Email already registered" }, 400),
    );
    await expect(client.register("a@b.com", "pw", "Alice")).rejects.toThrow(
      "Email already registered",
    );
  });

  // ─── guestLogin (189-192) ───────────────────────────────────────

  it("guestLogin sets csrf_token from response", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ access_token: "g", csrf_token: "c3", user: { id: "u" } }),
    );
    const result = await client.guestLogin();
    expect(result.access_token).toBe("g");
    expect((client as any)._csrfToken).toBe("c3");
  });

  it("guestLogin throws on error", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ detail: "Denied" }, 403));
    await expect(client.guestLogin()).rejects.toThrow("Denied");
  });

  // ─── getMe (194-199) ────────────────────────────────────────────

  it("getMe throws on error", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ detail: "No auth" }, 401));
    await expect(client.getMe()).rejects.toThrow("No auth");
  });

  // ─── logout (202) ───────────────────────────────────────────────

  it("logout posts to /auth/logout", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}));
    await client.logout();
    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE}/auth/logout`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  // ─── listPdfs (263-268) ─────────────────────────────────────────

  it("listPdfs returns items", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ items: [pdfDoc], total: 1 }),
    );
    const result = await client.listPdfs(5, 20);
    expect(result.items).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE}/pdfs?skip=5&limit=20`,
      expect.anything(),
    );
  });

  it("listPdfs throws on error", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ detail: "Nope" }, 403));
    await expect(client.listPdfs()).rejects.toThrow("Nope");
  });

  // ─── getPdf (270-275) ───────────────────────────────────────────

  it("getPdf returns document", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(pdfDoc));
    const result = await client.getPdf("p1");
    expect(result.id).toBe("p1");
  });

  it("getPdf throws on error", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ detail: "Missing" }, 404));
    await expect(client.getPdf("nope")).rejects.toThrow("Missing");
  });

  // ─── deletePdf (278-283) ────────────────────────────────────────

  it("deletePdf deletes document", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}, 204));
    await client.deletePdf("p1");
    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE}/pdfs/p1`,
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("deletePdf throws on error", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ detail: "Denied" }, 403));
    await expect(client.deletePdf("p1")).rejects.toThrow("Denied");
  });

  // ─── downloadPdf (288-293) ──────────────────────────────────────

  it("downloadPdf returns blob", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(null));
    const blob = await client.downloadPdf("p1");
    expect(blob).toBeDefined();
  });

  it("downloadPdf throws on error", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ detail: "PDF locked" }, 403),
    );
    await expect(client.downloadPdf("p1")).rejects.toThrow("PDF locked");
  });

  // ─── mergePdfs (297-309) ────────────────────────────────────────

  it("mergePdfs without outputFilename", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ ...pdfDoc, id: "m1" }));
    const result = await client.mergePdfs(["p1", "p2"]);
    expect(result.id).toBe("m1");
    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE}/pdfs/merge`,
      expect.objectContaining({
        body: expect.not.stringContaining("output_filename"),
      }),
    );
  });

  it("mergePdfs throws on error", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ detail: "Fail" }, 500));
    await expect(client.mergePdfs(["p1"])).rejects.toThrow("Fail");
  });

  // ─── splitPdf with ranges + filename (316-327) ──────────────────

  it("splitPdf with ranges and outputFilename", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([{ id: "s1" }]));
    await client.splitPdf("p1", "range", ["1-2"], "out.pdf");
    const call = mockFetch.mock.calls[0];
    expect(call[0]).toBe(`${BASE}/pdfs/p1/split`);
    const body = JSON.parse(call[1].body);
    expect(body.ranges).toEqual(["1-2"]);
    expect(body.output_filename).toBe("out.pdf");
  });

  it("splitPdf throws on error", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ detail: "Fail" }, 500));
    await expect(client.splitPdf("p1", "every")).rejects.toThrow("Fail");
  });

  // ─── reorderPages (333-344) ─────────────────────────────────────

  it("reorderPages without outputFilename", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(pdfDoc));
    await client.reorderPages("p1", [2, 1]);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.output_filename).toBeUndefined();
  });

  it("reorderPages throws on error", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ detail: "Fail" }, 500));
    await expect(client.reorderPages("p1", [1])).rejects.toThrow("Fail");
  });

  // ─── removePages (349-360) ──────────────────────────────────────

  it("removePages without outputFilename", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(pdfDoc));
    await client.removePages("p1", [1]);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.output_filename).toBeUndefined();
  });

  it("removePages throws on error", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ detail: "Fail" }, 500));
    await expect(client.removePages("p1", [1])).rejects.toThrow("Fail");
  });

  // ─── getMetadata (366-370) ──────────────────────────────────────

  it("getMetadata returns metadata", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ title: "Doc", author: "Alice" }),
    );
    const result = await client.getMetadata("p1");
    expect(result.title).toBe("Doc");
  });

  it("getMetadata throws on error", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ detail: "No" }, 404));
    await expect(client.getMetadata("p1")).rejects.toThrow("No");
  });

  // ─── updateMetadata (375-383) ───────────────────────────────────

  it("updateMetadata updates and returns document", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(pdfDoc));
    const result = await client.updateMetadata("p1", { title: "New" });
    expect(result.id).toBe("p1");
  });

  it("updateMetadata throws on error", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ detail: "No" }, 403));
    await expect(client.updateMetadata("p1", {})).rejects.toThrow("No");
  });

  // ─── unlockPdf (390-395) ────────────────────────────────────────

  it("unlockPdf sends password", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(pdfDoc));
    await client.unlockPdf("p1", "secret");
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.password).toBe("secret");
  });

  it("unlockPdf throws on error", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ detail: "Wrong" }, 401));
    await expect(client.unlockPdf("p1", "bad")).rejects.toThrow("Wrong");
  });

  // ─── protectPdf (400-405) ───────────────────────────────────────

  it("protectPdf sends password", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(pdfDoc));
    await client.protectPdf("p1", "secret");
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.password).toBe("secret");
  });

  it("protectPdf throws on error", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ detail: "No" }, 500));
    await expect(client.protectPdf("p1", "s")).rejects.toThrow("No");
  });

  // ─── refreshToken catch with onTokenRefreshFailed (427) ─────────

  it("refreshToken calls onTokenRefreshFailed on network error", async () => {
    const cb = jest.fn();
    client.onTokenRefreshFailed = cb;
    mockFetch.mockRejectedValueOnce(new Error("offline"));
    const result = await client.refreshToken();
    expect(result).toBeNull();
    expect(cb).toHaveBeenCalled();
  });
});
