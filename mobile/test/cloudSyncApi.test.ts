/**
 * Tests for cloud sync API operations (upload, download, delete).
 * These test the ApiClient directly, without localDb dependency.
 */
import { ApiClient } from "../src/shared/api";

const mockFetch = jest.fn();
globalThis.fetch = mockFetch as any;

const BASE = "https://pdfeditor-api.mirkobechini.com";

function ok(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 204 ? "No Content" : "OK",
    json: () => Promise.resolve(body),
    blob: () =>
      Promise.resolve(new Blob(["fake"], { type: "application/pdf" })),
  });
}

describe("Cloud sync API operations", () => {
  let client: ApiClient;

  beforeEach(() => {
    mockFetch.mockClear();
    client = new ApiClient();
    client.setToken("test-jwt");
    client.setCsrfToken("test-csrf");
  });

  it("uploadPdf sends file to cloud", async () => {
    mockFetch
      .mockResolvedValueOnce(ok({ id: "pdf-1" })) // fetch(fileUri) → blob
      .mockResolvedValueOnce(ok({ id: "pdf-1" })); // _fetch POST

    const result = await client.uploadPdf(
      "file:///test.pdf",
      "test.pdf",
      "application/pdf",
    );

    expect(result.id).toBe("pdf-1");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("listPdfs returns cloud PDFs", async () => {
    mockFetch.mockResolvedValueOnce(
      ok({
        items: [
          {
            id: "cloud-1",
            original_filename: "remote.pdf",
            file_size: 200,
            page_count: 5,
            created_at: "2026-01-01",
            updated_at: "2026-01-01",
          },
        ],
        total: 1,
      }),
    );

    const result = await client.listPdfs(0, 1000);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("cloud-1");
  });

  it("getPdf returns cloud PDF metadata", async () => {
    mockFetch.mockResolvedValueOnce(
      ok({
        id: "cloud-1",
        original_filename: "remote.pdf",
        file_size: 200,
        page_count: 5,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      }),
    );

    const pdf = await client.getPdf("cloud-1");
    expect(pdf.id).toBe("cloud-1");
    expect(pdf.original_filename).toBe("remote.pdf");
  });

  it("deletePdf sends DELETE to cloud", async () => {
    mockFetch.mockResolvedValueOnce(ok({}, 204));

    await client.deletePdf("cloud-1");
    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE}/pdfs/cloud-1`,
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
