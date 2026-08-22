import { ApiClient } from "../src/shared/api";
import type {
  AuthResponse,
  UserResponse,
  PdfDocument,
} from "../src/shared/types";

// Mock global fetch
const mockFetch = jest.fn();
globalThis.fetch = mockFetch as any;

const BASE = "https://pdfeditor-api.mirkobechini.com";

function mockJsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText:
      status === 429
        ? "Too Many Requests"
        : status === 404
          ? "Not Found"
          : "OK",
    json: () => Promise.resolve(data),
  });
}

describe("ApiClient", () => {
  let client: ApiClient;

  beforeEach(() => {
    mockFetch.mockClear();
    client = new ApiClient();
    client.setToken(null);
    client.setCsrfToken(null);
  });

  // ─── Auth ───────────────────────────────────────────────────────

  describe("login", () => {
    it("sends POST to /auth/login and sets csrf_token", async () => {
      const response: AuthResponse = {
        access_token: "jwt-token",
        token_type: "bearer",
        csrf_token: "csrf-123",
      };
      mockFetch.mockResolvedValueOnce(mockJsonResponse(response));

      const result = await client.login("a@b.com", "pw");

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/auth/login`,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("a@b.com"),
        }),
      );
      expect(result.access_token).toBe("jwt-token");
      expect((client as any)._csrfToken).toBe("csrf-123");
    });

    it("throws on 401", async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ detail: "Invalid credentials" }, 401),
      );
      await expect(client.login("a@b.com", "pw")).rejects.toThrow();
    });
  });

  describe("register", () => {
    it("sends POST to /auth/register with name", async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ access_token: "t", token_type: "bearer" }),
      );
      await client.register("a@b.com", "pw", "Alice");
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/auth/register`,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("Alice"),
        }),
      );
    });
  });

  describe("guestLogin", () => {
    it("sends POST to /auth/guest", async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({
          access_token: "guest-token",
          token_type: "bearer",
          user: { id: "g1" },
        }),
      );
      const result = await client.guestLogin();
      expect(result.access_token).toBe("guest-token");
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/auth/guest`,
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  describe("getMe", () => {
    it("sends GET to /auth/me with Authorization header", async () => {
      client.setToken("my-jwt");
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ id: "u1", email: "a@b.com" }),
      );
      const user = await client.getMe();
      expect(user.email).toBe("a@b.com");
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/auth/me`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer my-jwt",
          }),
        }),
      );
    });
  });

  // ─── PDF ────────────────────────────────────────────────────────

  describe("listPdfs", () => {
    it("sends GET to /pdfs", async () => {
      client.setToken("t");
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({
          items: [{ id: "p1", original_filename: "doc.pdf" }],
          total: 1,
        }),
      );
      const result = await client.listPdfs();
      expect(result.items).toHaveLength(1);
      expect(result.items[0].original_filename).toBe("doc.pdf");
    });
  });

  describe("getPdf", () => {
    it("sends GET to /pdfs/{id}", async () => {
      client.setToken("t");
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ id: "p1", original_filename: "doc.pdf" }),
      );
      const pdf = await client.getPdf("p1");
      expect(pdf.id).toBe("p1");
    });
  });

  describe("deletePdf", () => {
    it("sends DELETE to /pdfs/{id}", async () => {
      client.setToken("t");
      mockFetch.mockResolvedValueOnce(mockJsonResponse({}, 204));
      await client.deletePdf("p1");
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/pdfs/p1`,
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  // ─── Error handling ──────────────────────────────────────────────

  describe("extractError", () => {
    it("parses 429 as rate limit message", async () => {
      const res = {
        status: 429,
        statusText: "Too Many Requests",
        json: () => Promise.resolve({ detail: "Rate limit" }),
      } as Response;
      const msg = await ApiClient.extractError(res);
      expect(msg).toBe("Too many requests. Please try again later.");
    });

    it("parses JSON error body with detail", async () => {
      const res = {
        status: 400,
        statusText: "Bad Request",
        json: () =>
          Promise.resolve({ code: "INVALID_PDF", detail: "Not a PDF" }),
      } as Response;
      const msg = await ApiClient.extractError(res);
      expect(msg).toBe("Not a PDF");
    });

    it("falls back to detail string", async () => {
      const res = {
        status: 401,
        statusText: "Unauthorized",
        json: () => Promise.resolve({ detail: "Wrong password" }),
      } as Response;
      const msg = await ApiClient.extractError(res);
      expect(msg).toBe("Wrong password");
    });

    it("handles AbortError (DOMException)", async () => {
      const err = new DOMException("The operation was aborted", "AbortError");
      const msg = await ApiClient.extractError(err);
      expect(msg).toBe(
        "Connection timeout. The server is waking up, please try again in a moment.",
      );
    });

    it("handles TypeError network request failed", async () => {
      const err = new TypeError("Network request failed");
      const msg = await ApiClient.extractError(err);
      expect(msg).toBe("Connection error. Check your internet connection.");
    });

    it("handles plain Error object", async () => {
      const msg = await ApiClient.extractError(new Error("Something broke"));
      expect(msg).toBe("Something broke");
    });

    it("handles non-Error, non-object fallback", async () => {
      const msg = await ApiClient.extractError("just a string");
      expect(msg).toBe("An unexpected error occurred");
    });

    it("handles array detail in error response", async () => {
      const res = {
        status: 422,
        statusText: "Unprocessable",
        json: () =>
          Promise.resolve({
            detail: [{ msg: "field required" }],
          }),
      } as Response;
      const msg = await ApiClient.extractError(res);
      expect(msg).toBe("field required");
    });

    it("handles non-object body in error response", async () => {
      const res = {
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.resolve("raw string body"),
      } as Response;
      const msg = await ApiClient.extractError(res);
      expect(msg).toBe('"raw string body"');
    });

    it("handles JSON parse failure in error response", async () => {
      const res = {
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.reject(new Error("parse failed")),
      } as Response;
      const msg = await ApiClient.extractError(res);
      expect(msg).toBe("Internal Server Error");
    });

    it("handles real Response object (instanceof Response)", async () => {
      const res = new Response(JSON.stringify({ detail: "Not found" }), {
        status: 404,
        statusText: "Not Found",
      });
      const msg = await ApiClient.extractError(res);
      expect(msg).toBe("Not found");
    });
  });

  // ─── Token management ────────────────────────────────────────────

  describe("token", () => {
    it("getToken returns null initially", () => {
      expect(client.getToken()).toBeNull();
    });

    it("setToken/getToken roundtrip", () => {
      client.setToken("test-token");
      expect(client.getToken()).toBe("test-token");
    });

    it("setCsrfToken/getCsrfToken roundtrip", () => {
      client.setCsrfToken("csrf-abc");
      expect((client as any)._csrfToken).toBe("csrf-abc");
    });
  });

  // ─── Upload PDF (Blob-based) ────────────────────────────────────

  describe("uploadPdf", () => {
    it("fetches file, creates blob, POSTs to /pdfs/upload", async () => {
      client.setToken("t");
      const fileBlob = new Blob(["fake"]);
      mockFetch
        .mockReset()
        .mockResolvedValueOnce({ blob: () => Promise.resolve(fileBlob) }) // file read
        .mockResolvedValueOnce(
          mockJsonResponse({
            id: "p-new",
            original_filename: "doc.pdf",
            file_size: 100,
            page_count: 1,
            created_at: "",
            updated_at: "",
          }),
        );

      const result = await client.uploadPdf(
        "file:///test.pdf",
        "doc.pdf",
        "application/pdf",
      );
      expect(result.id).toBe("p-new");
      expect(mockFetch).toHaveBeenNthCalledWith(1, "file:///test.pdf");
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        `${BASE}/pdfs/upload?upload_source=mobile`,
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("throws when upload response is not ok", async () => {
      client.setToken("t");
      const fileBlob = new Blob(["fake"]);
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockFetch
        .mockReset()
        .mockResolvedValueOnce({ blob: () => Promise.resolve(fileBlob) }) // file read
        .mockResolvedValueOnce(
          Promise.resolve({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ detail: "Upload failed" }),
          }),
        );

      await expect(
        client.uploadPdf("file:///test.pdf", "doc.pdf", "application/pdf"),
      ).rejects.toThrow();
      consoleSpy.mockRestore();
    });
  });

  // ─── Download PDF ───────────────────────────────────────────────

  describe("downloadPdf", () => {
    it("sends GET to /pdfs/{id}/download and returns blob", async () => {
      client.setToken("t");
      const blob = new Blob(["pdf-content"], { type: "application/pdf" });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        blob: () => Promise.resolve(blob),
      });

      const result = await client.downloadPdf("p1");
      expect(result).toBeInstanceOf(Blob);
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/pdfs/p1/download`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer t",
          }),
        }),
      );
    });
  });

  // ─── Merge / Split / Reorder / Remove ───────────────────────────

  describe("mergePdfs", () => {
    it("sends POST to /pdfs/merge with pdf_ids", async () => {
      client.setToken("t");
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ id: "merged-1", page_count: 5 }),
      );
      const result = await client.mergePdfs(["p1", "p2"], "merged.pdf");
      expect(result.id).toBe("merged-1");
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/pdfs/merge`,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("p1"),
        }),
      );
    });
  });

  describe("splitPdf", () => {
    it("sends POST to /pdfs/{id}/split with mode", async () => {
      client.setToken("t");
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse([{ id: "split-1" }, { id: "split-2" }]),
      );
      const result = await client.splitPdf("p1", "every");
      expect(result).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/pdfs/p1/split`,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("every"),
        }),
      );
    });
  });

  describe("reorderPages", () => {
    it("sends POST to /pdfs/{id}/reorder with page_order", async () => {
      client.setToken("t");
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ id: "reordered-1", page_count: 3 }),
      );
      const result = await client.reorderPages("p1", [3, 1, 2]);
      expect(result.id).toBe("reordered-1");
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/pdfs/p1/reorder`,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("[3,1,2]"),
        }),
      );
    });
  });

  describe("removePages", () => {
    it("sends POST to /pdfs/{id}/remove-pages with page_numbers", async () => {
      client.setToken("t");
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ id: "removed-1", page_count: 2 }),
      );
      const result = await client.removePages("p1", [1]);
      expect(result.id).toBe("removed-1");
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/pdfs/p1/remove-pages`,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("[1]"),
        }),
      );
    });
  });

  // ─── Metadata ───────────────────────────────────────────────────

  describe("getMetadata", () => {
    it("sends GET to /pdfs/{id}/metadata", async () => {
      client.setToken("t");
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ title: "Doc", author: "Me" }),
      );
      const meta = await client.getMetadata("p1");
      expect(meta.title).toBe("Doc");
    });
  });

  describe("updateMetadata", () => {
    it("sends PUT to /pdfs/{id}/metadata", async () => {
      client.setToken("t");
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ id: "p1", title: "New Title" }),
      );
      const result = await client.updateMetadata("p1", { title: "New Title" });
      expect(result.title).toBe("New Title");
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/pdfs/p1/metadata`,
        expect.objectContaining({ method: "PUT" }),
      );
    });
  });

  // ─── Password ───────────────────────────────────────────────────

  describe("unlockPdf", () => {
    it("sends POST to /pdfs/{id}/unlock with password", async () => {
      client.setToken("t");
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ id: "p1", page_count: 3 }),
      );
      const result = await client.unlockPdf("p1", "secret");
      expect(result.id).toBe("p1");
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/pdfs/p1/unlock`,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("secret"),
        }),
      );
    });
  });

  describe("protectPdf", () => {
    it("sends POST to /pdfs/{id}/protect with password", async () => {
      client.setToken("t");
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ id: "p1", page_count: 3 }),
      );
      const result = await client.protectPdf("p1", "secret");
      expect(result.id).toBe("p1");
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/pdfs/p1/protect`,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("secret"),
        }),
      );
    });
  });

  // ─── Auth endpoints ─────────────────────────────────────────────

  describe("forgotPassword", () => {
    it("sends POST to /auth/forgot-password", async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({}));
      await client.forgotPassword("a@b.com");
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/auth/forgot-password`,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("a@b.com"),
        }),
      );
    });
  });

  describe("resetPassword", () => {
    it("sends POST to /auth/reset-password with token", async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ id: "u1", email: "a@b.com" }),
      );
      const result = await client.resetPassword("reset-token", "new-pw");
      expect(result.email).toBe("a@b.com");
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/auth/reset-password`,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("reset-token"),
        }),
      );
    });
  });
});
