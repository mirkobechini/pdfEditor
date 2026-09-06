import { test, expect } from "@playwright/test";
import { registerUser, uniqueEmail } from "../helpers/api";

const API_BASE = "http://127.0.0.1:8000";

test.describe("CSRF & CORS", () => {
  test("POST with valid Bearer token (no CSRF header) is accepted", async ({
    request,
  }) => {
    const email = uniqueEmail("csrf");
    const token = await registerUser(request, email);

    // State-changing request without CSRF header, but with valid Bearer
    const res = await request.post(`${API_BASE}/pdfs/upload`, {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {
        file: {
          name: "csrf.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.from("%PDF-1.4 test", "utf-8"),
        },
      },
    });

    // Should NOT be 403 CSRF — Bearer token is valid authentication
    expect(res.status()).not.toBe(403);
  });

  test("POST without Bearer and without CSRF header is rejected", async ({
    request,
  }) => {
    const res = await request.post(`${API_BASE}/pdfs/upload`, {
      multipart: {
        file: {
          name: "noauth.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.from("%PDF-1.4 test", "utf-8"),
        },
      },
    });

    // No auth at all → should be 401 (not authenticated), not 403 CSRF
    expect(res.status()).toBe(401);
  });

  test("CORS headers present on cross-origin request", async ({ request }) => {
    const res = await request.get(`${API_BASE}/health`, {
      headers: { Origin: "http://localhost:3000" },
    });
    expect(res.status()).toBe(200);
    const allowOrigin = res.headers()["access-control-allow-origin"];
    expect(allowOrigin).toBeTruthy();
  });
});
