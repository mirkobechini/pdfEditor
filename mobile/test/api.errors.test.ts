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
});
