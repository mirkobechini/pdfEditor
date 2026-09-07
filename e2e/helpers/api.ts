import { APIRequestContext, Page, expect } from "@playwright/test";

const API_BASE = "http://localhost:8000";

/**
 * Dismiss the iubenda cookie banner if it appears. The banner is a modal
 * alertdialog that blocks interaction with the page, so it must be closed
 * before filling forms or clicking buttons.
 */
export async function dismissCookieBanner(page: Page): Promise<void> {
  const reject = page.getByRole("button", { name: "Rifiuta" });
  // Wait for the banner to appear (it loads async), then click "Rifiuta".
  // If it never appears, proceed without dismissing.
  try {
    await reject.waitFor({ state: "visible", timeout: 5000 });
    await reject.click();
  } catch {
    // Banner not present — nothing to dismiss
  }
}

/**
 * Login via the real UI. Assumes the user already exists (via registerUser).
 * Returns once the app dashboard (/app) is loaded.
 */
export async function loginViaUI(
  page: Page,
  email: string,
  password = "Password123",
): Promise<void> {
  await page.goto("/login");
  await dismissCookieBanner(page);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await page.waitForURL("**/app", { timeout: 15000 });
}

/**
 * Upload a PDF via the real UI file input and wait for it to appear in the list.
 */
export async function uploadPdf(
  page: Page,
  filename: string,
  buffer: Buffer = makePdfBuffer(),
): Promise<void> {
  await page.locator('input[type="file"]').setInputFiles({
    name: filename,
    mimeType: "application/pdf",
    buffer,
  });
  await expect(page.getByText(filename).first()).toBeVisible({
    timeout: 15000,
  });
}

/** Register a new user and return the access token. */
export async function registerUser(
  request: APIRequestContext,
  email: string,
  password = "Password123",
  fullName = "E2E User",
): Promise<string> {
  const res = await request.post(`${API_BASE}/auth/register`, {
    data: { email, password, full_name: fullName },
  });
  if (!res.ok()) {
    throw new Error(`Register failed: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  return body.access_token;
}

/** Generate a unique email for a test. */
export function uniqueEmail(prefix = "e2e"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@test.com`;
}

/** Create a minimal valid PDF buffer. */
export function makePdfBuffer(): Buffer {
  // Minimal valid PDF (single empty page)
  const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer<</Size 4/Root 1 0 R>>
startxref
190
%%EOF`;
  return Buffer.from(pdf, "utf-8");
}
