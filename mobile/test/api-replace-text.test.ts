import { ApiClient } from "../src/shared/api";

const mockFetch = jest.fn();
globalThis.fetch = mockFetch as any;

const BASE = "https://pdfeditor-api.mirkobechini.com";

function mockJsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? "Not Found" : "OK",
    json: () => Promise.resolve(data),
  });
}

describe("ApiClient replaceText", () => {
  let client: ApiClient;

  beforeEach(() => {
    mockFetch.mockClear();
    client = new ApiClient();
    client.setToken("test-token");
    client.setCsrfToken("csrf-123");
  });

  it("sends POST to /pdfs/{id}/replace-text with search and replace", async () => {
    const mockResult = {
      id: "p1",
      original_filename: "replaced.pdf",
      file_size: 500,
      page_count: 5,
      is_password_protected: false,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    mockFetch.mockResolvedValueOnce(mockJsonResponse(mockResult));

    const result = await client.replaceText("p1", "old", "new");

    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE}/pdfs/p1/replace-text`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        }),
        body: expect.stringContaining('"search":"old"'),
      }),
    );
    expect(result.original_filename).toBe("replaced.pdf");
  });

  it("sends occurrence when specified", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({}));
    await client.replaceText("p1", "old", "new", 1);
    const body = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
    expect(body.occurrence).toBe(1);
  });

  it("sends output_filename when specified", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({}));
    await client.replaceText("p1", "old", "new", undefined, "out.pdf");
    const body = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
    expect(body.output_filename).toBe("out.pdf");
  });

  it("throws on error response", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ detail: "Not found" }, 404),
    );
    await expect(client.replaceText("p1", "old", "new")).rejects.toThrow();
  });
});
