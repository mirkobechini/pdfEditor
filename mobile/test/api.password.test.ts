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

  describe("createBugReport", () => {
    it("sends POST to /bugs with title, description and platform", async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ id: "b1", title: "Bug", platform: "mobile" }),
      );
      const result = await client.createBugReport(
        "Bug title",
        "Bug desc",
        "mobile",
      );
      expect(result.id).toBe("b1");
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/bugs`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            title: "Bug title",
            description: "Bug desc",
            platform: "mobile",
          }),
        }),
      );
    });

    it("defaults platform to mobile", async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ id: "b2", title: "Bug" }),
      );
      await client.createBugReport("Bug title", "Bug desc");
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/bugs`,
        expect.objectContaining({
          body: expect.stringContaining('"platform":"mobile"'),
        }),
      );
    });

    it("throws on failure", async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ detail: "Failed" }, 400),
      );
      await expect(client.createBugReport("t", "d")).rejects.toThrow();
    });
  });
});
