import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiClient } from "../api";

describe("ApiClient edge cases", () => {
  let client: ApiClient;
  let mockFetch: any;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
    client = new ApiClient("http://test.local");
    client.setToken("test-token");
  });

  it("refreshToken calls onTokenRefreshFailed on network error", async () => {
    const onFailed = vi.fn();
    client.onTokenRefreshFailed = onFailed;
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    const result = await client.refreshToken();
    expect(result).toBeNull();
    expect(onFailed).toHaveBeenCalled();
  });

  it("refreshToken returns null on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
    const result = await client.refreshToken();
    expect(result).toBeNull();
  });

  it("refreshToken calls onTokenRefreshed on success", async () => {
    const onRefreshed = vi.fn();
    client.onTokenRefreshed = onRefreshed;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ access_token: "new-token", csrf_token: "new-csrf" }),
    });
    const result = await client.refreshToken();
    expect(result).toEqual({
      access_token: "new-token",
      csrf_token: "new-csrf",
    });
    expect(onRefreshed).toHaveBeenCalledWith("new-token", "new-csrf");
  });

  it("syncUser returns null on network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    const result = await client.syncUser({
      id: "u1",
      email: "test@test.com",
      full_name: "Test",
      is_active: true,
      is_admin: false,
      is_guest: false,
      license_tier: "free",
      license_tier_source: "default",
    });
    expect(result).toBeNull();
  });

  it("syncUser returns null on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400 });
    const result = await client.syncUser({
      id: "u1",
      email: "test@test.com",
      full_name: "Test",
      is_active: true,
      is_admin: false,
      is_guest: false,
      license_tier: "free",
      license_tier_source: "default",
    });
    expect(result).toBeNull();
  });

  it("syncUser sets token and csrf on success", async () => {
    const setTokenSpy = vi.spyOn(client, "setToken");
    const setCsrfSpy = vi.spyOn(client, "setCsrfToken");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: "synced-token",
          csrf_token: "synced-csrf",
        }),
    });
    const result = await client.syncUser({
      id: "u1",
      email: "test@test.com",
      full_name: "Test",
      is_active: true,
      is_admin: false,
      is_guest: false,
      license_tier: "free",
      license_tier_source: "default",
    });
    expect(result).toEqual({
      access_token: "synced-token",
      csrf_token: "synced-csrf",
    });
    expect(setTokenSpy).toHaveBeenCalledWith("synced-token");
    expect(setCsrfSpy).toHaveBeenCalledWith("synced-csrf");
  });

  it("getPreferences returns defaults on error", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    const result = await client.getPreferences();
    expect(result).toEqual({
      theme: "dark",
      language: "it",
      default_zoom: 100,
      antialiasing: true,
      density: "comfortable",
    });
  });

  it("updateProfile sends PUT", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "u1",
          email: "test@test.com",
          full_name: "Updated",
        }),
    });
    const result = await client.updateProfile({ full_name: "Updated" });
    expect(result.full_name).toBe("Updated");
  });

  it("unlinkGoogle sends POST", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: "u1", email: "test@test.com" }),
    });
    const result = await client.unlinkGoogle("pass123");
    expect(result).toBeDefined();
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/auth/unlink/google",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ password: "pass123" }),
      }),
    );
  });
});
