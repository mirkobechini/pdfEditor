import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "../api";

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe("AuthProvider integration (via api)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api as any).token = null;
  });

  it("api.login stores token on success", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "u1", email: "test@test.com" }), {
        status: 200,
        headers: new Headers({ "set-cookie": "token=jwt123" }),
      }),
    );
    const user = await api.login("test@test.com", "pass");
    expect(user.id).toBe("u1");
  });

  it("api.register creates user", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "u2", email: "new@test.com" }), {
        status: 201,
      }),
    );
    const user = await api.register("new@test.com", "pass");
    expect(user.email).toBe("new@test.com");
  });

  it("api.getMe returns current user", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "u1", email: "test@test.com" }), {
        status: 200,
      }),
    );
    const user = await api.getMe();
    expect(user.email).toBe("test@test.com");
  });

  it("api.logout calls logout endpoint", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await api.logout();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/logout"),
      expect.any(Object),
    );
  });

  it("api throws on failed login", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Invalid credentials" }), {
        status: 401,
      }),
    );
    await expect(api.login("wrong@test.com", "wrong")).rejects.toThrow();
  });
});
