import { describe, it, expect, vi, beforeEach } from "vitest";
import { api, ApiClient } from "../api";

// We need to test the static method extractError
// and verify the class structure

describe("ApiClient", () => {
  describe("extractError", () => {
    it("extracts detail string from JSON response", async () => {
      const res = new Response(
        JSON.stringify({ detail: "Email already registered" }),
        { status: 400 },
      );
      const error = await ApiClient.extractError(res);
      expect(error).toBe("Email already registered");
    });

    it("extracts first error msg from array", async () => {
      const res = new Response(
        JSON.stringify({ detail: [{ msg: "field required" }] }),
        { status: 422 },
      );
      const error = await ApiClient.extractError(res);
      expect(error).toBe("field required");
    });

    it("falls back to statusText for non-JSON", async () => {
      const res = new Response("not json", {
        status: 500,
        statusText: "Internal Server Error",
      });
      const error = await ApiClient.extractError(res);
      expect(error).toBe("Internal Server Error");
    });

    it("handles empty detail gracefully", async () => {
      const res = new Response(JSON.stringify({}), { status: 400 });
      const error = await ApiClient.extractError(res);
      expect(error).toBe("{}");
    });
  });
});
