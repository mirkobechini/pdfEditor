import { test, expect } from "@playwright/test";

/**
 * Tranche 6 — share via link su backend desktop (issue #917).
 * Flusso: register → upload → POST /pdfs/{id}/share → link (url) → GET /share/{token} (pubblico).
 */

function uniqueEmail(): string {
  return `desk_${Date.now()}_${Math.floor(Math.random() * 1e6)}@test.com`;
}

function makePdfBuffer(): Buffer {
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

test("crea share link da un PDF locale e lo risolve", async ({ request }) => {
  // register + upload
  const email = uniqueEmail();
  const reg = await request.post("/auth/register", {
    data: { email, password: "Password123", full_name: "Desk User" },
  });
  const token = (await reg.json()).access_token;
  const auth = { Authorization: `Bearer ${token}` };

  const up = await request.post("/pdfs/upload", {
    headers: auth,
    multipart: {
      file: { name: "share.pdf", mimeType: "application/pdf", buffer: makePdfBuffer() },
    },
  });
  expect(up.status()).toBe(201);
  const pdfId = (await up.json()).id;

  // crea il link di condivisione
  const share = await request.post(`/pdfs/${pdfId}/share`, {
    headers: auth,
    data: { expires_in_days: 7 },
  });
  expect(share.status()).toBe(200);
  const link = await share.json();
  expect(link.token).toBeTruthy();
  expect(link.url).toContain(`/share/${link.token}`);

  // info pubblica del link (senza auth)
  const info = await request.get(`/share/${link.token}`);
  expect(info.status()).toBe(200);
  const infoBody = await info.json();
  expect(infoBody.filename).toBe("share.pdf");
  expect(infoBody.has_password).toBe(false);
});
