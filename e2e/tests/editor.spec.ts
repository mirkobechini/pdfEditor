import { test, expect } from "@playwright/test";
import {
  registerUser,
  uniqueEmail,
  loginViaUI,
  uploadPdf,
} from "../helpers/api";

test.describe("Editor features", () => {
  // Merge flow: upload 2 PDFs, open merge dialog from toolbar, select both,
  // confirm merge, and verify the new merged file appears in the list.
  test("merge two PDFs from toolbar", async ({ page, request }) => {
    const email = uniqueEmail("merge");
    await registerUser(request, email);
    await loginViaUI(page, email);

    await uploadPdf(page, "merge-a.pdf");
    await uploadPdf(page, "merge-b.pdf");

    // Open the merge dialog from the toolbar ("Unisci")
    await page
      .getByRole("button", { name: "Unisci", exact: true })
      .first()
      .click();

    // Dialog heading
    await expect(
      page.getByRole("heading", { name: "Unisci PDF" }),
    ).toBeVisible();

    // Check both PDFs in the merge dialog (checkbox wrapped in a <label>)
    await page
      .locator("label", { hasText: "merge-a.pdf" })
      .locator('input[type="checkbox"]')
      .check();
    await page
      .locator("label", { hasText: "merge-b.pdf" })
      .locator('input[type="checkbox"]')
      .check();

    // Optionally set a deterministic output name
    const output = page.getByPlaceholder("merged.pdf");
    if (await output.isVisible().catch(() => false)) {
      await output.fill("merged-test.pdf");
    }

    // Confirm merge (the dialog's "Unisci" button, exact match)
    await page
      .getByRole("button", { name: "Unisci", exact: true })
      .last()
      .click();

    // The merged file should appear in the sidebar list
    await expect(page.getByText(/merged-test\.pdf/i).first()).toBeVisible({
      timeout: 15000,
    });
  });

  // The remaining merge/split/reorder/remove/replace-text/protect/metadata
  // dialogs depend on pdf.js thumbnails and CSRF in the browser, which is
  // fragile in E2E. These features are already covered by backend pytest
  // (test_merge, test_split, test_reorder, test_remove, test_text,
  // test_protect, test_metadata).

  test("delete PDF from sidebar", async ({ page, request }) => {
    const email = uniqueEmail("delete");
    await registerUser(request, email);
    await loginViaUI(page, email);

    await uploadPdf(page, "delete.pdf");

    // Click the delete button (trash icon)
    const fileRow = page.getByText("delete.pdf").first();
    await fileRow.hover();
    await page.getByTitle("Elimina").click();

    // Confirm in the delete modal
    await expect(
      page.getByRole("heading", { name: "Elimina PDF" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Elimina", exact: true }).click();

    // The file should disappear
    await expect(page.getByText("delete.pdf").first()).not.toBeVisible({
      timeout: 15000,
    });
  });
});
