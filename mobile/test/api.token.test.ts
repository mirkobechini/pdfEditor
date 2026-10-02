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
  describe("token", () => {
    it("getToken returns null initially", () => {
      expect(client.getToken()).toBeNull();
    });

    it("setToken/getToken roundtrip", () => {
      client.setToken("test-token");
      expect(client.getToken()).toBe("test-token");
    });

    it("setCsrfToken/getCsrfToken roundtrip", () => {
      client.setCsrfToken("csrf-abc");
      expect((client as any)._csrfToken).toBe("csrf-abc");
    });
  });
});
