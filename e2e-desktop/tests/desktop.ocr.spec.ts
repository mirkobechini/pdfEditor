import { test, expect } from "@playwright/test";

/**
 * Tranche 5 — OCR locale (issue #917).
 * L'endpoint POST /pdfs/{id}/ocr ritorna 200 (OCR ok) oppure 503 OCR_UNAVAILABLE
 * quando il binary `tesseract` non è installato (come ora in locale/WSL).
 * Il test è quindi tollerante a entrambi i casi, mantenendo il contratto.
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

test("POST /pdfs/{id}/ocr rispetta il contratto (200 o 503 se tesseract assente)", async ({
  request,
}) => {
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
      file: { name: "ocr.pdf", mimeType: "application/pdf", buffer: makePdfBuffer() },
    },
  });
  expect(up.status()).toBe(201);
  const pdfId = (await up.json()).id;

  const ocr = await request.post(`/pdfs/${pdfId}/ocr`, {
    headers: auth,
    data: { language: "eng" },
  });

  if (ocr.status() === 200) {
    // tesseract presente → ritorna il pdf aggiornato + character_count
    const body = await ocr.json();
    expect(body).toHaveProperty("pdf");
    expect(typeof body.character_count).toBe("number");
  } else {
    // tesseract assente → 503 con codice OCR_UNAVAILABLE
    expect(ocr.status()).toBe(503);
    const body = await ocr.json();
    expect(JSON.stringify(body)).toMatch(/OCR_UNAVAILABLE|unavailable/i);
  }
});
