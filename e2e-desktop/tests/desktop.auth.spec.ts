import { test, expect } from "@playwright/test";

/**
 * Tranche 3 — auth SQLite locale (issue #917).
 * Il backend è in modalità desktop (SQLite + DISABLE_CSRF): si usa il Bearer
 * token JWT restituito da register/login, come fa il sidecar locale.
 */

function uniqueEmail(): string {
  return `desk_${Date.now()}_${Math.floor(Math.random() * 1e6)}@test.com`;
}

test("register crea utente e ritorna access_token + csrf_token", async ({ request }) => {
  const email = uniqueEmail();
  const res = await request.post("/auth/register", {
    data: { email, password: "Password123", full_name: "Desk User" },
  });
  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(body.access_token).toBeTruthy();
  expect(body).toHaveProperty("csrf_token");
});

test("login con credenziali valide ritorna token", async ({ request }) => {
  const email = uniqueEmail();
  await request.post("/auth/register", {
    data: { email, password: "Password123", full_name: "Desk User" },
  });

  const res = await request.post("/auth/login", {
    data: { email, password: "Password123" },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.access_token).toBeTruthy();
});

test("GET /auth/me con Bearer token ritorna l'utente", async ({ request }) => {
  const email = uniqueEmail();
  const reg = await request.post("/auth/register", {
    data: { email, password: "Password123", full_name: "Desk User" },
  });
  const token = (await reg.json()).access_token;
  expect(token).toBeTruthy();

  const res = await request.get("/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status()).toBe(200);
  const me = await res.json();
  // L'utente può essere restituito come {user:{...}} o diretto: accettiamo entrambi
  const user = me.user ?? me;
  expect(user.email).toBe(email);
});

test("login con password errata ritorna 401", async ({ request }) => {
  const email = uniqueEmail();
  await request.post("/auth/register", {
    data: { email, password: "Password123", full_name: "Desk User" },
  });

  const res = await request.post("/auth/login", {
    data: { email, password: "WrongPass123" },
  });
  expect(res.status()).toBe(401);
});
