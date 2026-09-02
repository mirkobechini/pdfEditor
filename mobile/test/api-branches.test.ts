/**
 * Tests for ApiClient remaining uncovered branches.
 */
import { ApiClient } from "../src/shared/api";

// Mock global fetch
const mockFetch = jest.fn();
globalThis.fetch = mockFetch as any;

const BASE = "https://pdfeditor-api.mirkobechini.com";

function mockJsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 429 ? "Too Many Requests" : "OK",
    json: () => Promise.resolve(data),
    clone: () => ({
      json: () => Promise.resolve(data),
    }),
  });
}

describe("ApiClient - remaining branches", () => {
  let client: ApiClient;

  beforeEach(() => {
    mockFetch.mockClear();
    client = new ApiClient();
    client.setToken(null);
    client.setCsrfToken(null);
  });

  // ─── extractErrorResponse branches (78-82) ─────────────────────

  describe("extractErrorResponse", () => {
    it("returns detail[0].msg for array detail", async () => {
      const res = {
        status: 400,
        statusText: "Bad Request",
        json: () => Promise.resolve({ detail: [{ msg: "Field is required" }] }),
      };
      const result = await ApiClient.extractErrorResponse(res as any);
      expect(result).toBe("Field is required");
    });

    it("returns statusText when detail array is empty", async () => {
      const res = {
        status: 400,
        statusText: "Bad Request",
        json: () => Promise.resolve({ detail: [] }),
      };
      const result = await ApiClient.extractErrorResponse(res as any);
      expect(result).toBe("Bad Request");
    });

    it("returns JSON.stringify for non-detail body", async () => {
      const res = {
        status: 400,
        statusText: "Bad Request",
        json: () => Promise.resolve({ foo: "bar" }),
      };
      const result = await ApiClient.extractErrorResponse(res as any);
      expect(result).toBe('{"foo":"bar"}');
    });

    it("returns statusText when json parsing fails", async () => {
      const res = {
        status: 400,
        statusText: "Bad Request",
        json: () => Promise.reject(new Error("Invalid JSON")),
      };
      const result = await ApiClient.extractErrorResponse(res as any);
      expect(result).toBe("Bad Request");
    });
  });

  // ─── register with csrf_token (161) ────────────────────────────

  describe("register", () => {
    it("sets csrf_token from response", async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({
          access_token: "t",
          token_type: "bearer",
          csrf_token: "csrf-456",
        }),
      );
      await client.register("a@b.com", "pw", "Alice");
      expect((client as any)._csrfToken).toBe("csrf-456");
    });

    it("throws on error response", async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ detail: "Email already registered" }, 400),
      );
      await expect(client.register("a@b.com", "pw", "Alice")).rejects.toThrow(
        "Email already registered",
      );
    });
  });

  // ─── logout (192) ──────────────────────────────────────────────

  describe("logout", () => {
    it("sends POST to /auth/logout", async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({}));
      await client.logout();
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/auth/logout`,
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  // ─── forgotPassword / resetPassword (202-229) ──────────────────

  describe("forgotPassword", () => {
    it("sends POST to /auth/forgot-password", async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ message: "Email sent" }),
      );
      const result = await client.forgotPassword("a@b.com");
      expect(result.message).toBe("Email sent");
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/auth/forgot-password`,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("a@b.com"),
        }),
      );
    });

    it("throws on error response", async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ detail: "Email not found" }, 404),
      );
      await expect(client.forgotPassword("a@b.com")).rejects.toThrow(
        "Email not found",
      );
    });
  });

  describe("resetPassword", () => {
    it("sends POST to /auth/reset-password", async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ id: "u1", email: "a@b.com" }),
      );
      const result = await client.resetPassword("token123", "newpass");
      expect(result.email).toBe("a@b.com");
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/auth/reset-password`,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("token123"),
        }),
      );
    });

    it("throws on error response", async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ detail: "Invalid token" }, 400),
      );
      await expect(client.resetPassword("token123", "newpass")).rejects.toThrow(
        "Invalid token",
      );
    });
  });

  // ─── splitPdf with ranges (267-403) ────────────────────────────

  describe("splitPdf with ranges", () => {
    it("sends ranges and output_filename when provided", async () => {
      client.setToken("t");
      mockFetch.mockResolvedValueOnce(mockJsonResponse([{ id: "split-1" }]));
      await client.splitPdf("p1", "range", ["1-3"], "out.pdf");
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/pdfs/p1/split`,
        expect.objectContaining({
          body: expect.stringContaining("range"),
        }),
      );
    });
  });

  // ─── refreshToken catch with onTokenRefreshFailed (427) ────────

  describe("refreshToken failure callback", () => {
    it("calls onTokenRefreshFailed when fetch throws", async () => {
      const onTokenRefreshFailed = jest.fn();
      client.onTokenRefreshFailed = onTokenRefreshFailed;
      mockFetch.mockRejectedValueOnce(new Error("Network request failed"));
      const result = await client.refreshToken();
      expect(result).toBeNull();
      expect(onTokenRefreshFailed).toHaveBeenCalled();
    });
  });
});
