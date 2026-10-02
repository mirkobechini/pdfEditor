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
    });
  });
});
