/**
 * Share-link operations (cloud-only, like OCR/annotations). Isolated from
 * pdfService.ts because sharing needs a STABLE cloud copy — re-uploading on
 * every call (the compressPdf/ocrPdf/addAnnotation pattern) would create a
 * new cloud PDF each time, orphaning any links already issued against the
 * previous copy. Instead, the local↔cloud mapping is persisted in
 * localDb's `cloud_id` column and reused.
 */
import { getLocalPdfById, setPdfCloudId } from "./localDb";
import { api, type ShareLink } from "../shared/api";

/** Returns the cloud id for a local PDF, uploading it once if it has none yet. */
export async function ensureCloudUploaded(pdfId: string): Promise<string> {
  const pdf = await getLocalPdfById(pdfId);
  if (!pdf) throw new Error("PDF not found locally");
  if (pdf.cloud_id) return pdf.cloud_id;

  const uploaded = await api.uploadPdf(pdf.uri, pdf.original_filename, "application/pdf");
  await setPdfCloudId(pdfId, uploaded.id);
  return uploaded.id;
}

export async function createShareLink(
  pdfId: string,
  password?: string,
  expiresInDays?: number,
): Promise<ShareLink> {
  const cloudId = await ensureCloudUploaded(pdfId);
  return api.createShareLink(cloudId, password, expiresInDays);
}

export async function listShareLinks(pdfId: string): Promise<ShareLink[]> {
  const cloudId = await ensureCloudUploaded(pdfId);
  return api.listShareLinks(cloudId);
}

export async function revokeShareLink(pdfId: string, token: string): Promise<void> {
  const cloudId = await ensureCloudUploaded(pdfId);
  return api.revokeShareLink(cloudId, token);
}
