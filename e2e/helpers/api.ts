import { APIRequestContext } from "@playwright/test";

const API_BASE = "http://127.0.0.1:8000";

/** Register a new user and return the access token. */
export async function registerUser(
  request: APIRequestContext,
  email: string,
  password = "Password123",
  fullName = "E2E User",
): Promise<string> {
  const res = await request.post(`${API_BASE}/auth/register`, {
    data: { email, password, full_name: fullName },
  });
  if (!res.ok()) {
    throw new Error(`Register failed: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  return body.access_token;
}

/** Generate a unique email for a test. */
export function uniqueEmail(prefix = "e2e"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@test.com`;
}

/** Create a minimal valid PDF buffer. */
export function makePdfBuffer(): Buffer {
  // Minimal valid PDF (single empty page)
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
