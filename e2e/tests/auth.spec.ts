import { test, expect } from "@playwright/test";
import { registerUser, uniqueEmail } from "../helpers/api";

test.describe("Auth flows", () => {
  test("register → auto-login → sees empty PDF list", async ({ page }) => {
    const email = uniqueEmail("reg");
    await page.goto("/register");

    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "Password123");
    await page.fill('input[name="full_name"]', "E2E User");
    await page.click('button[type="submit"]');

    // Should redirect to the app/dashboard
    await page.waitForURL("**/app", { timeout: 15000 });
    await expect(page.getByText(/i miei pdf|my pdfs/i).first()).toBeVisible();
  });

  test("login with valid credentials → sees PDF list", async ({
    page,
    request,
  }) => {
    const email = uniqueEmail("login");
    await registerUser(request, email);

    await page.goto("/login");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "Password123");
    await page.click('button[type="submit"]');

    await page.waitForURL("**/app", { timeout: 15000 });
    await expect(page.getByText(/i miei pdf|my pdfs/i).first()).toBeVisible();
  });

  test("login with wrong password → shows error", async ({ page, request }) => {
    const email = uniqueEmail("wrong");
    await registerUser(request, email);

    await page.goto("/login");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "WrongPass123");
    await page.click('button[type="submit"]');

    await expect(
      page.getByText(/password errata|wrong password/i),
    ).toBeVisible();
  });

  test("logout → returns to login page", async ({ page, request }) => {
    const email = uniqueEmail("logout");
    await registerUser(request, email);

    // Login via UI
    await page.goto("/login");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "Password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/app", { timeout: 15000 });

    // Logout
    await page.getByRole("button", { name: /logout|esci/i }).click();
    await page.waitForURL("**/login", { timeout: 15000 });
  });
});
