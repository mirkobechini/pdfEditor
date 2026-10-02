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
});
