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

    it("returns RATE_LIMIT for 429 status", async () => {
      const res = new Response(
        JSON.stringify({ detail: "Rate limit exceeded: 5 per 1 minute" }),
        { status: 429 },
      );
      const error = await ApiClient.extractError(res);
      expect(error).toBe("RATE_LIMIT");
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
      globalThis.fetch = vi.fn().mockResolvedValue(
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
      globalThis.fetch = vi.fn().mockResolvedValue(
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
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "Not found" }), {
          status: 404,
        }),
      );
      await expect(api.voteBugReport("bad")).rejects.toThrow("Not found");
    });
  });

  describe("uploadPdfWithProgress", () => {
    it("sets withCredentials=true on XHR", async () => {
      let capturedXHR: any = null;

      const OriginalXHR = globalThis.XMLHttpRequest;
      globalThis.XMLHttpRequest = class MockXHR {
        withCredentials = false;
        upload = { onprogress: null };
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        status = 200;
        responseText = JSON.stringify({
          id: "pdf1",
          original_filename: "test.pdf",
        });
        open = vi.fn();
        setRequestHeader = vi.fn();
        send = vi.fn();
        constructor() {
          capturedXHR = this;
        }
      } as any;

      const file = new File(["pdf content"], "test.pdf", {
        type: "application/pdf",
      });

      const uploadPromise = api.uploadPdfWithProgress(file);

      // Trigger onload on the captured instance
      capturedXHR.onload();

      await uploadPromise;

      expect(capturedXHR.withCredentials).toBe(true);

      globalThis.XMLHttpRequest = OriginalXHR;
    });

    it("includes CSRF token in XHR headers when cookie present", async () => {
      // Set a fake CSRF cookie
      Object.defineProperty(document, "cookie", {
        writable: true,
        value: "csrf_token=test-csrf-token",
      });

      let capturedXHR: any = null;

      const OriginalXHR = globalThis.XMLHttpRequest;
      globalThis.XMLHttpRequest = class MockXHR {
        withCredentials = false;
        upload = { onprogress: null };
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        status = 200;
        responseText = JSON.stringify({
          id: "pdf1",
          original_filename: "test.pdf",
        });
        open = vi.fn();
        setRequestHeader = vi.fn();
        send = vi.fn();
        constructor() {
          capturedXHR = this;
        }
      } as any;

      const file = new File(["pdf content"], "test.pdf", {
        type: "application/pdf",
      });

      const uploadPromise = api.uploadPdfWithProgress(file);
      capturedXHR.onload();
      await uploadPromise;

      expect(capturedXHR.setRequestHeader).toHaveBeenCalledWith(
        "X-CSRF-Token",
        "test-csrf-token",
      );

      globalThis.XMLHttpRequest = OriginalXHR;
    });
  });
});
