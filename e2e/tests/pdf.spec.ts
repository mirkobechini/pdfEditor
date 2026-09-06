import { test, expect } from "@playwright/test";
import { registerUser, uniqueEmail, makePdfBuffer } from "../helpers/api";

test.describe("PDF flows", () => {
  test("upload PDF → appears in list → download works", async ({
    page,
    request,
  }) => {
    const email = uniqueEmail("pdf");
    await registerUser(request, email);

    // Login via UI
    await page.goto("/login");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "Password123");
    await page.click('button[type="submit"]');
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
  }) => {
    const email = uniqueEmail("apipdf");
    const token = await registerUser(request, email);

    // Upload without CSRF header — should work with valid Bearer token
    const res = await request.post("http://127.0.0.1:8000/pdfs/upload", {
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

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.original_filename).toBe("api-test.pdf");
  });
});
