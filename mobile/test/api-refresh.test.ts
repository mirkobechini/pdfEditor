/**
 * Tests for ApiClient refreshToken and auto-refresh on 401.
 */
import { ApiClient } from "../src/shared/api";

// Mock global fetch
const mockFetch = jest.fn();
globalThis.fetch = mockFetch as any;

const BASE = "https://pdfeditor-api.mirkobechini.com";

function mockJsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 401 ? "Unauthorized" : "OK",
    json: () => Promise.resolve(data),
    clone: () => ({
      json: () => Promise.resolve(data),
    }),
  });
}

describe("ApiClient - refreshToken", () => {
  let client: ApiClient;

  beforeEach(() => {
    mockFetch.mockClear();
    client = new ApiClient();
    client.setToken(null);
    client.setCsrfToken(null);
  });

  it("refreshes token and calls onTokenRefreshed", async () => {
    const onTokenRefreshed = jest.fn();
    client.onTokenRefreshed = onTokenRefreshed;

    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({
        access_token: "new-jwt",
        csrf_token: "new-csrf",
      }),
    );

    const result = await client.refreshToken();
    expect(result).toEqual({
      access_token: "new-jwt",
      csrf_token: "new-csrf",
    });
    expect(client.getToken()).toBe("new-jwt");
    expect(onTokenRefreshed).toHaveBeenCalledWith("new-jwt", "new-csrf");
  });

  it("returns null when response is not ok", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({}, 401));
    const result = await client.refreshToken();
    expect(result).toBeNull();
  });

  it("calls onTokenRefreshFailed on network error", async () => {
    const onTokenRefreshFailed = jest.fn();
    client.onTokenRefreshFailed = onTokenRefreshFailed;

    mockFetch.mockRejectedValueOnce(new Error("Network request failed"));
    const result = await client.refreshToken();
    expect(result).toBeNull();
    expect(onTokenRefreshFailed).toHaveBeenCalled();
  });

  it("does not call onTokenRefreshed when csrf_token missing", async () => {
    const onTokenRefreshed = jest.fn();
    client.onTokenRefreshed = onTokenRefreshed;

    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ access_token: "new-jwt" }),
    );

    const result = await client.refreshToken();
    expect(result).toEqual({ access_token: "new-jwt" });
    expect(onTokenRefreshed).toHaveBeenCalledWith("new-jwt", "");
  });
});

describe("ApiClient - auto-refresh on 401", () => {
  let client: ApiClient;

  beforeEach(() => {
    mockFetch.mockClear();
    client = new ApiClient();
    client.setToken("old-token");
    client.setCsrfToken("old-csrf");
  });

  it("auto-refreshes on 401 with INVALID_CREDENTIALS and retries", async () => {
    // First call: 401 with INVALID_CREDENTIALS
    mockFetch
      .mockResolvedValueOnce(
        mockJsonResponse({ detail: "INVALID_CREDENTIALS" }, 401),
      )
      // refreshToken call
      .mockResolvedValueOnce(
        mockJsonResponse({
          access_token: "new-jwt",
          csrf_token: "new-csrf",
        }),
      )
      // retry call
      .mockResolvedValueOnce(mockJsonResponse({ ok: true }));

    const res = await (client as any)._fetch(`${BASE}/pdfs`, { method: "GET" });
    expect(res.ok).toBe(true);
    expect(client.getToken()).toBe("new-jwt");
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("auto-refreshes on 401 with expired detail and retries", async () => {
    mockFetch
      .mockResolvedValueOnce(
        mockJsonResponse({ detail: "Token has expired" }, 401),
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          access_token: "new-jwt",
          csrf_token: "new-csrf",
        }),
      )
      .mockResolvedValueOnce(mockJsonResponse({ ok: true }));

    const res = await (client as any)._fetch(`${BASE}/pdfs`, { method: "GET" });
    expect(res.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("does not auto-refresh when detail is not recognized", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ detail: "Some other error" }, 401),
    );

    const res = await (client as any)._fetch(`${BASE}/pdfs`, { method: "GET" });
    expect(res.status).toBe(401);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry when refresh fails", async () => {
    mockFetch
      .mockResolvedValueOnce(
        mockJsonResponse({ detail: "INVALID_CREDENTIALS" }, 401),
      )
      .mockResolvedValueOnce(mockJsonResponse({}, 401));

    const res = await (client as any)._fetch(`${BASE}/pdfs`, { method: "GET" });
    expect(res.status).toBe(401);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry when refresh fails with expired detail", async () => {
    mockFetch
      .mockResolvedValueOnce(
        mockJsonResponse({ detail: "Token has expired" }, 401),
      )
      .mockResolvedValueOnce(mockJsonResponse({}, 401));

    const res = await (client as any)._fetch(`${BASE}/pdfs`, { method: "GET" });
    expect(res.status).toBe(401);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("does not auto-refresh when already refreshing", async () => {
    // Set _isRefreshing to true to simulate concurrent request
    (client as any)._isRefreshing = true;
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ detail: "INVALID_CREDENTIALS" }, 401),
    );

    const res = await (client as any)._fetch(`${BASE}/pdfs`, { method: "GET" });
    expect(res.status).toBe(401);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("does not auto-refresh on non-401 status", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({}, 500));

    const res = await (client as any)._fetch(`${BASE}/pdfs`, { method: "GET" });
    expect(res.status).toBe(500);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("handles non-JSON 401 body gracefully (line 122)", async () => {
    // 401 response with a body that is NOT valid JSON
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: () => Promise.reject(new Error("Invalid JSON")),
      clone: () => ({
        json: () => Promise.reject(new Error("Invalid JSON")),
      }),
    });

    const res = await (client as any)._fetch(`${BASE}/pdfs`, { method: "GET" });
    expect(res.status).toBe(401);
    // No refresh attempted since body could not be parsed
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
