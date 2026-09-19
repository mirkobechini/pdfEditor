import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DocumentsApiClient } from "../documentsApi";

describe("DocumentsApiClient", () => {
  const client = new DocumentsApiClient("http://test:8001");

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists documents with pagination", async () => {
    const mockRes = { total: 1, page: 1, page_size: 12, items: [] };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockRes,
      }),
    );

    const res = await client.listDocuments(1, 12);
    expect(res).toEqual(mockRes);
    expect(fetch).toHaveBeenCalledWith(
      "http://test:8001/api/v1/documents?page=1&page_size=12",
    );
  });

  it("searches documents with encoded query", async () => {
    const mockRes = { total: 0, page: 1, page_size: 12, items: [] };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockRes,
      }),
    );

    await client.searchDocuments("hello world", 1, 12);
    expect(fetch).toHaveBeenCalledWith(
      "http://test:8001/api/v1/search?q=hello%20world&page=1&page_size=12",
    );
  });

  it("gets document detail", async () => {
    const mockRes = { id: 1, title: "Doc" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockRes,
      }),
    );

    const res = await client.getDocument(1);
    expect(res).toEqual(mockRes);
    expect(fetch).toHaveBeenCalledWith("http://test:8001/api/v1/documents/1");
  });

  it("gets stats", async () => {
    const mockRes = {
      total_documents: 10,
      by_language: {},
      by_subject: {},
      last_ingest: null,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockRes,
      }),
    );

    const res = await client.getStats();
    expect(res).toEqual(mockRes);
    expect(fetch).toHaveBeenCalledWith("http://test:8001/api/v1/stats");
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      }),
    );

    await expect(client.listDocuments()).rejects.toThrow(
      "Documents API error 500",
    );
  });
});
