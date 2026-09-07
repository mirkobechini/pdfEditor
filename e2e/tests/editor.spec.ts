import { test, expect } from "@playwright/test";
import {
  registerUser,
  uniqueEmail,
  loginViaUI,
  uploadPdf,
} from "../helpers/api";

test.describe("Editor features", () => {
  // NOTE: merge/split/reorder/remove/replace-text/protect/metadata dialogs
  // depend on pdf.js thumbnails and CSRF in the browser, which is fragile in
  // E2E. These features are already covered by backend pytest (test_merge,
  // test_split, test_reorder, test_remove, test_text, test_protect,
  // test_metadata). E2E covers the cross-origin flows (auth, CSRF, CORS,
  // upload) and the robust UI flows (delete).

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
