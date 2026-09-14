import { test, expect } from "@playwright/test";
import { registerUser, uniqueEmail } from "../helpers/api";

const API_BASE = "http://localhost:8000";

test.describe("Cloud sync", () => {
  test("GET /sync/status with Bearer token works", async ({
    request,
    playwright,
  }) => {
    const email = uniqueEmail("sync");
    const token = await registerUser(request, email);

    // Fresh context WITHOUT cookies — simulates the desktop sidecar
    const noCookieCtx = await playwright.request.newContext();
    const res = await noCookieCtx.get(`${API_BASE}/sync/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    await noCookieCtx.dispose();

    expect(res.status()).toBe(200);
    // Status returns the last sync timestamp (may be null for a new user)
    expect(body).toHaveProperty("last_sync_at");
  });

  test("POST /sync/push with Bearer token works", async ({
    request,
    playwright,
  }) => {
    const email = uniqueEmail("syncpush");
    const token = await registerUser(request, email);

    const noCookieCtx = await playwright.request.newContext();
    const res = await noCookieCtx.post(`${API_BASE}/sync/push`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: { pdfs: [] },
    });
    const body = await res.json();
    await noCookieCtx.dispose();

    expect(res.status()).toBe(200);
    expect(body).toHaveProperty("pushed");
    expect(body).toHaveProperty("synced_at");
  });

  test("POST /auth/refresh issues a new token", async ({
    request,
    playwright,
  }) => {
    const email = uniqueEmail("refresh");
    const token = await registerUser(request, email);

    // Fresh context WITHOUT cookies — the refresh endpoint must accept the
    // Bearer token from the Authorization header (no cookie required).
    const noCookieCtx = await playwright.request.newContext();
    const res = await noCookieCtx.post(`${API_BASE}/auth/refresh`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    await noCookieCtx.dispose();

    expect(res.status()).toBe(200);
    expect(body).toHaveProperty("access_token");
    expect(typeof body.access_token).toBe("string");
    expect(body.access_token.length).toBeGreaterThan(0);
  });
});
