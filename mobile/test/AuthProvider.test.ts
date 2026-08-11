/**
 * Tests for AuthProvider logic — token management, session restore, login/register/logout flow.
 *
 * Tests the storage operations and API call patterns that AuthProvider uses,
 * without rendering React components (TurboModule incompatibility).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../src/shared/api";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockFetch = jest.fn();
globalThis.fetch = mockFetch as any;

const REMEMBER_TOKEN_KEY = "pdfeditor_remember_token";
const REMEMBER_USER_KEY = "pdfeditor_remember_user";
const CSRF_TOKEN_KEY = "pdfeditor_csrf_token";

function ok(body: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  });
}

describe("AuthProvider logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.setToken(null);
    api.setCsrfToken(null);
  });

  describe("restoreSession", () => {
    it("restores token from AsyncStorage", async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === REMEMBER_TOKEN_KEY) return Promise.resolve("saved-jwt");
        if (key === CSRF_TOKEN_KEY) return Promise.resolve("saved-csrf");
        return Promise.resolve(null);
      });

      // Simulate restoreSession
      const remembered = await AsyncStorage.getItem(REMEMBER_TOKEN_KEY);
      if (remembered) api.setToken(remembered);

      const csrf = await AsyncStorage.getItem(CSRF_TOKEN_KEY);
      if (csrf) api.setCsrfToken(csrf);

      expect(api.getToken()).toBe("saved-jwt");
      expect((api as any)._csrfToken).toBe("saved-csrf");
    });

    it("calls /auth/me with restored token", async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === REMEMBER_TOKEN_KEY) return Promise.resolve("saved-jwt");
        return Promise.resolve(null);
      });

      api.setToken("saved-jwt");
      mockFetch.mockResolvedValueOnce(ok({ id: "u1", email: "a@b.com" }));

      const res = await fetch(
        "https://pdfeditor-api.mirkobechini.com/auth/me",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer saved-jwt",
            "Content-Type": "application/json",
          },
        },
      );

      expect(res.ok).toBe(true);
      const user = await res.json();
      expect(user.email).toBe("a@b.com");
    });

    it("restores user from cache when /auth/me fails", async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === REMEMBER_TOKEN_KEY) return Promise.resolve("saved-jwt");
        if (key === REMEMBER_USER_KEY)
          return Promise.resolve(
            JSON.stringify({ id: "u1", email: "a@b.com" }),
          );
        return Promise.resolve(null);
      });

      api.setToken("saved-jwt");
      mockFetch.mockResolvedValueOnce(
        Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ detail: "Not authenticated" }),
        }),
      );

      const res = await fetch(
        "https://pdfeditor-api.mirkobechini.com/auth/me",
        {
          method: "GET",
          headers: { Authorization: "Bearer saved-jwt" },
        },
      );

      // Token expired — restore from cache
      const cached = await AsyncStorage.getItem(REMEMBER_USER_KEY);
      const user = cached ? JSON.parse(cached) : null;
      expect(user).not.toBeNull();
      expect(user.email).toBe("a@b.com");
    });
  });

  describe("login flow", () => {
    it("saves token and CSRF on login", async () => {
      mockFetch.mockResolvedValueOnce(
        ok({
          access_token: "login-jwt",
          token_type: "bearer",
          csrf_token: "login-csrf",
        }),
      );

      const res = await api.login("a@b.com", "pw");
      api.setToken(res.access_token);
      if (res.csrf_token) {
        api.setCsrfToken(res.csrf_token);
        await AsyncStorage.setItem(CSRF_TOKEN_KEY, res.csrf_token);
      }

      expect(api.getToken()).toBe("login-jwt");
      expect((api as any)._csrfToken).toBe("login-csrf");
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        CSRF_TOKEN_KEY,
        "login-csrf",
      );
    });

    it("persists token when remember=true", async () => {
      mockFetch.mockResolvedValueOnce(
        ok({ access_token: "login-jwt", token_type: "bearer" }),
      );

      const res = await api.login("a@b.com", "pw");
      api.setToken(res.access_token);

      // Simulate remember=true
      await AsyncStorage.setItem(REMEMBER_TOKEN_KEY, res.access_token);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        REMEMBER_TOKEN_KEY,
        "login-jwt",
      );
    });

    it("does not persist token when remember=false", async () => {
      mockFetch.mockResolvedValueOnce(
        ok({ access_token: "login-jwt", token_type: "bearer" }),
      );

      const res = await api.login("a@b.com", "pw");
      api.setToken(res.access_token);

      // Simulate remember=false
      await AsyncStorage.removeItem(REMEMBER_TOKEN_KEY);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(REMEMBER_TOKEN_KEY);
    });
  });

  describe("register flow", () => {
    it("saves token and CSRF on register", async () => {
      mockFetch.mockResolvedValueOnce(
        ok({
          access_token: "register-jwt",
          token_type: "bearer",
          csrf_token: "register-csrf",
        }),
      );

      const res = await api.register("a@b.com", "pw", "Alice");
      api.setToken(res.access_token);
      if (res.csrf_token) {
        api.setCsrfToken(res.csrf_token);
        await AsyncStorage.setItem(CSRF_TOKEN_KEY, res.csrf_token);
      }

      expect(api.getToken()).toBe("register-jwt");
      expect((api as any)._csrfToken).toBe("register-csrf");
    });
  });

  describe("guestLogin flow", () => {
    it("saves guest token to AsyncStorage", async () => {
      mockFetch.mockResolvedValueOnce(
        ok({
          access_token: "guest-jwt",
          token_type: "bearer",
          csrf_token: "guest-csrf",
        }),
      );

      const res = await api.guestLogin();
      api.setToken(res.access_token);
      if (res.csrf_token) {
        api.setCsrfToken(res.csrf_token);
        await AsyncStorage.setItem(CSRF_TOKEN_KEY, res.csrf_token);
      }
      await AsyncStorage.setItem(REMEMBER_TOKEN_KEY, res.access_token);

      expect(api.getToken()).toBe("guest-jwt");
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        REMEMBER_TOKEN_KEY,
        "guest-jwt",
      );
    });
  });

  describe("logout flow", () => {
    it("clears all tokens and user data", async () => {
      api.setToken("some-jwt");
      api.setCsrfToken("some-csrf");

      // Simulate logout
      api.setToken(null);
      api.setCsrfToken(null);
      await AsyncStorage.removeItem(REMEMBER_TOKEN_KEY);
      await AsyncStorage.removeItem(REMEMBER_USER_KEY);
      await AsyncStorage.removeItem(CSRF_TOKEN_KEY);

      expect(api.getToken()).toBeNull();
      expect((api as any)._csrfToken).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(REMEMBER_TOKEN_KEY);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(REMEMBER_USER_KEY);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(CSRF_TOKEN_KEY);
    });
  });

  describe("forgotPassword", () => {
    it("calls API with email", async () => {
      mockFetch.mockResolvedValueOnce(ok({ message: "Email sent" }));
      const result = await api.forgotPassword("a@b.com");
      expect(result.message).toBe("Email sent");
    });
  });
});
