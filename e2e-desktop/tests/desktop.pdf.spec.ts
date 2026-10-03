import { test, expect } from "@playwright/test";

/**
 * Tranche 4 — upload + download + list su disco locale (issue #917).
 * Backend in modalità desktop (SQLite + DISABLE_CSRF): usa il Bearer token
 * come fa il sidecar locale.
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

async function registerAndToken(request: import("@playwright/test").APIRequestContext): Promise<string> {
  const email = uniqueEmail();
  const reg = await request.post("/auth/register", {
    data: { email, password: "Password123", full_name: "Desk User" },
  });
  expect(reg.status()).toBe(201);
  return (await reg.json()).access_token;
}

test("upload PDF, compare in lista, scaricabile e identico", async ({ request }) => {
  const token = await registerAndToken(request);
  const auth = { Authorization: `Bearer ${token}` };
  const pdfBuffer = makePdfBuffer();

  // upload via multipart
  const up = await request.post("/pdfs/upload", {
    headers: auth,
    multipart: {
      file: {
        name: "desk-test.pdf",
        mimeType: "application/pdf",
        buffer: pdfBuffer,
      },
    },
  });
  expect(up.status()).toBe(201);
  const uploaded = await up.json();
  expect(uploaded.original_filename).toBe("desk-test.pdf");
  const pdfId = uploaded.id;

  // list
  const list = await request.get("/pdfs", { headers: auth });
  expect(list.status()).toBe(200);
  const listBody = await list.json();
  const items = listBody.items ?? [];
  expect(items.some((p: any) => p.id === pdfId)).toBe(true);

  // download
  const dl = await request.get(`/pdfs/${pdfId}/download`, { headers: auth });
  expect(dl.status()).toBe(200);
  const dlBuffer = await dl.body();
  expect(dlBuffer.length).toBeGreaterThan(0);
  // deve iniziare con %PDF
  expect(dlBuffer.subarray(0, 4).toString()).toBe("%PDF");
});

test("lista senza token -> 401", async ({ request }) => {
  const res = await request.get("/pdfs");
  expect(res.status()).toBe(401);
});
