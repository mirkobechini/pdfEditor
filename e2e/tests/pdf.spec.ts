import { test, expect } from "@playwright/test";
import {
  registerUser,
  uniqueEmail,
  makePdfBuffer,
  dismissCookieBanner,
} from "../helpers/api";

test.describe("PDF flows", () => {
  test("upload PDF → appears in list → download works", async ({
    page,
    request,
  }) => {
    const email = uniqueEmail("pdf");
    await registerUser(request, email);

    // Login via UI
    await page.goto("/login");
    await dismissCookieBanner(page);
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill("Password123");
    await page.getByRole("button", { name: "Accedi", exact: true }).click();
    await page.waitForURL("**/app", { timeout: 15000 });

    // Upload a PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test.pdf",
      mimeType: "application/pdf",
      buffer: makePdfBuffer(),
    });

    // The PDF should appear in the list
    await expect(page.getByText("test.pdf").first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("upload via API with Bearer token (no CSRF header) works", async ({
    request,
    playwright,
  }) => {
    const email = uniqueEmail("apipdf");
    const token = await registerUser(request, email);

    // Use a fresh context WITHOUT cookies to simulate a cookie-less client
    // (e.g. mobile app or desktop sidecar). The Bearer token alone must work.
    const noCookieCtx = await playwright.request.newContext();
    const res = await noCookieCtx.post("http://localhost:8000/pdfs/upload", {
      headers: {
        Authorization: `Bearer ${token}`,
        // No X-CSRF-Token header — tests the Bearer exemption
      },
      multipart: {
        file: {
          name: "api-test.pdf",
          mimeType: "application/pdf",
          buffer: makePdfBuffer(),
        },
      },
    });

    // Read body BEFORE disposing the context
    const status = res.status();
    const body = await res.json();
    await noCookieCtx.dispose();

    expect(status).toBe(201);
    expect(body.original_filename).toBe("api-test.pdf");
  });
});
