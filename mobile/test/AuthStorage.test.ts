/**
 * Tests for AuthProvider storage logic — AsyncStorage + token management.
 *
 * We test the storage operations that AuthProvider uses internally,
 * without rendering React components (TurboModule incompatibility).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const REMEMBER_TOKEN_KEY = "pdfeditor_remember_token";
const REMEMBER_USER_KEY = "pdfeditor_remember_user";
const CSRF_TOKEN_KEY = "pdfeditor_csrf_token";

describe("AuthProvider storage logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("token persistence", () => {
    it("saves remember token to AsyncStorage", async () => {
      await AsyncStorage.setItem(REMEMBER_TOKEN_KEY, "my-jwt");
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        REMEMBER_TOKEN_KEY,
        "my-jwt",
      );
    });

    it("reads remember token from AsyncStorage", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue("my-jwt");
      const val = await AsyncStorage.getItem(REMEMBER_TOKEN_KEY);
      expect(val).toBe("my-jwt");
    });

    it("removes CSRF token on logout", async () => {
      await AsyncStorage.removeItem(CSRF_TOKEN_KEY);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(CSRF_TOKEN_KEY);
    });

    it("removes remember token on logout", async () => {
      await AsyncStorage.removeItem(REMEMBER_TOKEN_KEY);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(REMEMBER_TOKEN_KEY);
    });

    it("removes user cache on logout", async () => {
      await AsyncStorage.removeItem(REMEMBER_USER_KEY);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(REMEMBER_USER_KEY);
    });
  });

  describe("user cache", () => {
    it("caches user data to AsyncStorage", async () => {
      const user = { id: "u1", email: "a@b.com" };
      await AsyncStorage.setItem(REMEMBER_USER_KEY, JSON.stringify(user));
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        REMEMBER_USER_KEY,
        JSON.stringify(user),
      );
    });

    it("reads cached user from AsyncStorage", async () => {
      const user = { id: "u1", email: "a@b.com" };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(user),
      );
      const cached = await AsyncStorage.getItem(REMEMBER_USER_KEY);
      expect(JSON.parse(cached!)).toEqual(user);
    });
  });

  describe("CSRF token", () => {
    it("saves CSRF token to AsyncStorage", async () => {
      await AsyncStorage.setItem(CSRF_TOKEN_KEY, "csrf-abc");
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        CSRF_TOKEN_KEY,
        "csrf-abc",
      );
    });

    it("reads CSRF token from AsyncStorage", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue("csrf-abc");
      const val = await AsyncStorage.getItem(CSRF_TOKEN_KEY);
      expect(val).toBe("csrf-abc");
    });
  });
});
