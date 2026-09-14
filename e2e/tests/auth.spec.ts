import { test, expect } from "@playwright/test";
import { registerUser, uniqueEmail, dismissCookieBanner } from "../helpers/api";

test.describe("Auth flows", () => {
  test("register → auto-login → sees empty PDF list", async ({ page }) => {
    const email = uniqueEmail("reg");
    await page.goto("/register");
    await dismissCookieBanner(page);

    await page.locator('input[type="text"]').fill("E2E User"); // full name
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').nth(0).fill("Password123");
    await page.locator('input[type="password"]').nth(1).fill("Password123");
    await page.getByRole("button", { name: "Crea Account" }).click();

    // Should redirect to the app/dashboard
    await page.waitForURL("**/app", { timeout: 15000 });
    await expect(page.getByText("Nessun PDF caricato").first()).toBeVisible();
  });

  test("login with valid credentials → sees PDF list", async ({
    page,
    request,
  }) => {
    const email = uniqueEmail("login");
    await registerUser(request, email);

    await page.goto("/login");
    await dismissCookieBanner(page);
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill("Password123");
    await page.getByRole("button", { name: "Accedi", exact: true }).click();

    await page.waitForURL("**/app", { timeout: 15000 });
    await expect(page.getByText("Nessun PDF caricato").first()).toBeVisible();
  });

  test("login with wrong password → shows error", async ({ page, request }) => {
    const email = uniqueEmail("wrong");
    await registerUser(request, email);

    await page.goto("/login");
    await dismissCookieBanner(page);
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill("WrongPass123");
    await page.getByRole("button", { name: "Accedi", exact: true }).click();

    await expect(
      page.getByText(
        /email o password non validi|invalid email or password|password errata|wrong password/i,
      ),
    ).toBeVisible();
  });

  test("logout → returns to login page", async ({ page, request }) => {
    const email = uniqueEmail("logout");
    await registerUser(request, email);

    // Login via UI
    await page.goto("/login");
    await dismissCookieBanner(page);
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill("Password123");
    await page.getByRole("button", { name: "Accedi", exact: true }).click();
    await page.waitForURL("**/app", { timeout: 15000 });

    // Logout
    await page.getByRole("button", { name: /esci|sign out/i }).click();
    await page.waitForURL("**/login", { timeout: 15000 });
  });
});
