import { test, expect } from "@playwright/test";
import { registerUser, uniqueEmail, makePdfBuffer } from "../helpers/api";

const API_BASE = "http://localhost:8000";

test.describe("CSRF & CORS", () => {
  test("POST with valid Bearer token (no CSRF header) is accepted", async ({
    request,
    playwright,
  }) => {
    const email = uniqueEmail("csrf");
    const token = await registerUser(request, email);

    // Fresh context WITHOUT cookies — simulates a cookie-less client (mobile/desktop)
    const noCookieCtx = await playwright.request.newContext();
    const res = await noCookieCtx.post(`${API_BASE}/pdfs/upload`, {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {
        file: {
          name: "csrf.pdf",
          mimeType: "application/pdf",
          buffer: makePdfBuffer(),
        },
      },
    });

    // Should NOT be 403 CSRF — Bearer token is valid authentication
    expect(res.status()).toBe(201);
    await noCookieCtx.dispose();
  });

  test("POST without Bearer and without CSRF header is rejected", async ({
    request,
  }) => {
    const res = await request.post(`${API_BASE}/pdfs/upload`, {
      multipart: {
        file: {
          name: "noauth.pdf",
          mimeType: "application/pdf",
          buffer: makePdfBuffer(),
        },
      },
    });

    // No auth and no CSRF → CSRF middleware rejects with 403
    expect(res.status()).toBe(403);
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
