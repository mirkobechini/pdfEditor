import { test, expect } from "@playwright/test";

/**
 * Tranche 2 — vero health del backend in modalità desktop (SQLite locale).
 * Il backend è avviato dal webServer di playwright config (port 8001).
 */
test("GET /health risponde 200", async ({ request }) => {
  const res = await request.get("/health");
  expect(res.status()).toBe(200);
});

test("GET /openapi.json espone le route del backend", async ({ request }) => {
  const res = await request.get("/openapi.json");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Object.keys(body.paths ?? {}).length).toBeGreaterThan(0);
});
