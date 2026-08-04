/**
 * Auth integration tests — tests the API layer.
 * AuthProvider React rendering skipped due to @testing-library/react-native incompatibility.
 */
import { api } from "../src/shared/api";

const mockFetch = jest.fn();
global.fetch = mockFetch;

const BASE = "https://pdfeditor-api.mirkobechini.com";

function ok(body: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
}
function fail(body: unknown, status = 401) {
  return Promise.resolve({ ok: false, status, json: () => Promise.resolve(body) });
}

describe("Auth integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.setToken(null);
    api.setCsrfToken(null);
  });

  it("setToken/getToken roundtrip", () => {
    api.setToken("my-jwt");
    expect(api.getToken()).toBe("my-jwt");
  });

  it("login returns token", async () => {
    mockFetch.mockResolvedValueOnce(ok({ access_token: "login-jwt", token_type: "bearer" }));
    const res = await api.login("a@b.com", "pw");
    expect(res.access_token).toBe("login-jwt");
  });

  it("login throws on 401", async () => {
    mockFetch.mockResolvedValueOnce(fail({ detail: "Invalid" }));
    await expect(api.login("a@b.com", "pw")).rejects.toThrow();
  });

  it("guestLogin creates session", async () => {
    mockFetch.mockResolvedValueOnce(ok({ access_token: "guest-jwt", user: { id: "g1" } }));
    const res = await api.guestLogin();
    expect(res.access_token).toBe("guest-jwt");
  });

  it("getMe returns user with Authorization header", async () => {
    api.setToken("valid-jwt");
    mockFetch.mockResolvedValueOnce(ok({ id: "u1", email: "user@test.com" }));
    const user = await api.getMe();
    expect(user.email).toBe("user@test.com");
    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE}/auth/me`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer valid-jwt" }),
      })
    );
  });

  it("getMe throws on 401", async () => {
    api.setToken("expired");
    mockFetch.mockResolvedValueOnce(fail({ detail: "Not authenticated" }));
    await expect(api.getMe()).rejects.toThrow();
  });

  it("logout sends POST", async () => {
    mockFetch.mockResolvedValueOnce(ok({}));
    await api.logout();
    expect(mockFetch).toHaveBeenCalledWith(`${BASE}/auth/logout`, expect.objectContaining({ method: "POST" }));
  });
});
