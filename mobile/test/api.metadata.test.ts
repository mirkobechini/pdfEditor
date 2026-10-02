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
});
