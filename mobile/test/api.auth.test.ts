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
  describe("login", () => {
    it("sends POST to /auth/login and sets csrf_token", async () => {
      const response: AuthResponse = {
        access_token: "jwt-token",
        token_type: "bearer",
        csrf_token: "csrf-123",
      };
      mockFetch.mockResolvedValueOnce(mockJsonResponse(response));

      const result = await client.login("a@b.com", "pw");

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/auth/login`,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("a@b.com"),
        }),
      );
      expect(result.access_token).toBe("jwt-token");
      expect((client as any)._csrfToken).toBe("csrf-123");
    });

    it("throws on 401", async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ detail: "Invalid credentials" }, 401),
      );
      await expect(client.login("a@b.com", "pw")).rejects.toThrow();
    });
  });

  describe("register", () => {
    it("sends POST to /auth/register with name", async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ access_token: "t", token_type: "bearer" }),
      );
      await client.register("a@b.com", "pw", "Alice");
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/auth/register`,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("Alice"),
        }),
      );
    });
  });

  describe("guestLogin", () => {
    it("sends POST to /auth/guest", async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({
          access_token: "guest-token",
          token_type: "bearer",
          user: { id: "g1" },
        }),
      );
      const result = await client.guestLogin();
      expect(result.access_token).toBe("guest-token");
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/auth/guest`,
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  describe("googleLogin", () => {
    it("sends POST to /auth/google with id_token", async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({
          access_token: "google-token",
          token_type: "bearer",
        }),
      );
      const result = await client.googleLogin("google-id-token");
      expect(result.access_token).toBe("google-token");
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/auth/google`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ id_token: "google-id-token" }),
        }),
      );
    });

    it("throws on failure", async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ detail: "Google auth failed" }, 400),
      );
      await expect(client.googleLogin("bad-token")).rejects.toThrow();
    });
  });

  describe("getMe", () => {
    it("sends GET to /auth/me with Authorization header", async () => {
      client.setToken("my-jwt");
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ id: "u1", email: "a@b.com" }),
      );
      const user = await client.getMe();
      expect(user.email).toBe("a@b.com");
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/auth/me`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer my-jwt",
          }),
        }),
      );
    });
  });
});
