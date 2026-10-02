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
});
