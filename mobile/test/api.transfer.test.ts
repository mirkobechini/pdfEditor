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
  describe("downloadPdf", () => {
    it("sends GET to /pdfs/{id}/download and returns an ArrayBuffer", async () => {
      client.setToken("t");
      const buffer = new TextEncoder().encode("pdf-content").buffer;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        arrayBuffer: () => Promise.resolve(buffer),
      });

      const result = await client.downloadPdf("p1");
      expect(result).toBe(buffer);
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

  describe("exportPdf", () => {
    it("sends POST to /pdfs/{id}/export and returns an ArrayBuffer", async () => {
      client.setToken("t");
      const buffer = new TextEncoder().encode("txt-content").buffer;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        arrayBuffer: () => Promise.resolve(buffer),
      });

      const result = await client.exportPdf("p1", "txt");
      expect(result).toBe(buffer);
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/pdfs/p1/export?fmt=txt`,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer t",
          }),
        }),
      );
    });

    it("throws when export response is not ok", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: () => Promise.resolve({ detail: "Unsupported format" }),
      });

      await expect(client.exportPdf("p1", "docx")).rejects.toThrow(
        "Unsupported format",
      );
    });
  });

  describe("importFile", () => {
    it("fetches file, creates blob, POSTs to /pdfs/import", async () => {
      client.setToken("t");
      const fileBlob = new Blob(["hello"], { type: "text/plain" });
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          blob: () => Promise.resolve(fileBlob),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: () =>
            Promise.resolve({ id: "new1", original_filename: "hello.pdf" }),
        });

      const result = await client.importFile(
        "file:///docs/hello.txt",
        "hello.txt",
        "text/plain",
      );
      expect(result.id).toBe("new1");
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/pdfs/import`,
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("throws when import response is not ok", async () => {
      const fileBlob = new Blob(["hello"], { type: "text/plain" });
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          blob: () => Promise.resolve(fileBlob),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: () => Promise.resolve({ detail: "Unsupported file type" }),
        });

      await expect(
        client.importFile("file:///docs/hello.txt", "hello.txt", "text/plain"),
      ).rejects.toThrow("Unsupported file type");
    });
  });
});
