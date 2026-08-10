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
      const blob = new Blob(["fake-pdf-content"], { type: "application/pdf" });
      // Mock fetch to return the file content
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ id: "p-new", original_filename: "doc.pdf" }),
      );

      // The uploadPdf now does: fetch(fileUri) → blob → formData.append("file", blob, fileName)
      // We need to mock the first fetch to return the file content
      const fileFetchMock = jest.fn().mockResolvedValue({
        blob: () => Promise.resolve(blob),
      });
      const originalFetch = globalThis.fetch;
      // Simulate: uploadPdf fetches the file, then calls api._fetch
      // For simplicity, we mock the file fetch to return a blob
      const fileFetch = jest.fn().mockResolvedValue({
        blob: () => Promise.resolve(blob),
      });

      // Override global fetch for the first call (file read), second call (upload)
      // The uploadPdf method does: const res = await fetch(fileUri); const blob = await res.blob();
      // then: const uploadRes = await this._fetch(url, ...)
      // We'll mock both calls
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
      // First call should be file fetch
      expect(mockFetch).toHaveBeenNthCalledWith(1, "file:///test.pdf");
      // Second call should be upload
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        `${BASE}/pdfs/upload`,
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});
