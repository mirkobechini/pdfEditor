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

  describe("listMyBugReports", () => {
    it("calls /bugs/my and returns bug reports", async () => {
      const mockBugs = [{ id: "b1", title: "Bug" }];
      globalThis.fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify(mockBugs), { status: 200 }),
        );
      const result = await api.listMyBugReports();
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/bugs/my"),
        expect.any(Object),
      );
      expect(result).toEqual(mockBugs);
    });

    it("throws on error response", async () => {
      globalThis.fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ detail: "Error" }), { status: 400 }),
        );
      await expect(api.listMyBugReports()).rejects.toThrow("Error");
    });
  });

  describe("adminSendReset", () => {
    it("sends POST request and returns message", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Reset email sent!" }), {
          status: 200,
        }),
      );
      const result = await api.adminSendReset("user-123");
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/admin/users/user-123/send-reset"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(result.message).toBe("Reset email sent!");
    });

    it("throws on error response", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "User not found" }), {
          status: 404,
        }),
      );
      await expect(api.adminSendReset("bad-id")).rejects.toThrow(
        "User not found",
      );
    });
  });

  describe("searchBugReports", () => {
    it("calls /bugs/search with query", async () => {
      globalThis.fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify([{ id: "b1", title: "Bug" }]), {
            status: 200,
          }),
        );
      const result = await api.searchBugReports("crash");
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/bugs/search?q=crash"),
        expect.any(Object),
      );
      expect(result).toHaveLength(1);
    });

    it("throws on error", async () => {
      globalThis.fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ detail: "Error" }), { status: 400 }),
        );
      await expect(api.searchBugReports("x")).rejects.toThrow("Error");
    });
  });

  describe("voteBugReport", () => {
    it("calls POST /bugs/{id}/vote", async () => {
      globalThis.fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ id: "b1", report_count: 2 }), {
            status: 200,
          }),
        );
      const result = await api.voteBugReport("b1");
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/bugs/b1/vote"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(result.report_count).toBe(2);
    });

    it("throws on error", async () => {
      globalThis.fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ detail: "Not found" }), {
            status: 404,
          }),
        );
      await expect(api.voteBugReport("bad")).rejects.toThrow("Not found");
    });
  });
});
