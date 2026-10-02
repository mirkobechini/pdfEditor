import { test, expect } from "@playwright/test";
import {
  registerUser,
  uniqueEmail,
  loginViaUI,
  uploadPdf,
} from "../helpers/api";

/**
 * CSRF-sensitive mutations in the browser (issue #905).
 *
 * Il login web usa `cloudApi` (seconda istanza client) e le azioni sulla
 * collezione usano `api`: questo file copre esplicitamente le operazioni
 * scritte (PUT/POST) che vivono lì, come gate per il refactor A1 (#883)
 * — il tentativo revertito (commit 6177665f) aveva perso il pre-fetch CSRF
 * su `cloudApi` e l'e2e "login → lista PDF" era l'unico a vederlo.
 *
 * Nota: upload singolo e merge (POST) sono già coperti da pdf.spec.ts ed
 * editor.spec.ts — qui aggiungiamo ciò che mancava: rename (PUT) e il flusso
 * combinato cloudApi→api dopo il login.
 */
test.describe("CSRF mutations (browser)", () => {
  test("rename PDF via UI (PUT with CSRF)", async ({ page, request }) => {
    const email = uniqueEmail("rename");
    await registerUser(request, email);
    await loginViaUI(page, email);

    await uploadPdf(page, "da-rinominare.pdf");

    // Click the rename button (pencil) on the file row
    const renameBtn = page.getByTitle("Rinomina").first();
    await expect(renameBtn).toBeVisible();
    await renameBtn.click();

    // The rename input appears (autofocus), type the new name and commit
    const renameInput = page.locator('input[class*="border-blue"]');
    await expect(renameInput).toBeVisible();
    await renameInput.fill("rinominato.pdf");
    await renameInput.press("Enter");

    // The renamed file is shown, the old name disappears
    await expect(page.getByText("rinominato.pdf").first()).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.getByText("da-rinominare.pdf").first(),
    ).not.toBeVisible({ timeout: 5000 });
  });
});