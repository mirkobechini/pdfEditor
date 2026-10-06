/**
 * Cloud-backed operations (compress, OCR, annotations, export/import) and the
 * offline compression fallback. These upload/download through the backend `api`.
 */
import { PDFDocument } from "@cantoo/pdf-lib";
import { getLocalPdfById, savePdfLocally } from "../localDb";
import { api } from "../../shared/api";
import type { LocalPdf } from "../../shared/types";
import { generateId, getPdfDir, normalizeFilename, readPdfBytes, writePdfBytes } from "./io";

/**
 * Compress a PDF via the cloud backend (pdf-lib has no native compression).
 * Flow: upload local PDF → compress on backend → download → save locally.
 */
export async function compressPdf(
  pdfId: string,
  quality: "low" | "medium" | "high" = "medium",
  fileName?: string,
  overwrite = false,
): Promise<LocalPdf | null> {
  try {
    const pdf = await getLocalPdfById(pdfId);
    if (!pdf) return null;

    // Upload the local PDF to the cloud
    const uploaded = await api.uploadPdf(
      pdf.uri,
      pdf.original_filename,
      "application/pdf",
    );

    // Compress on the backend
    const compressed = await api.compressPdf(
      uploaded.id,
      quality,
      fileName || undefined,
      overwrite,
    );

    // Download the compressed PDF
    const buffer = await api.downloadPdf(compressed.id);
    const bytes = new Uint8Array(buffer);

    // Save locally
    const id = generateId();
    const pdfDir = getPdfDir();
    const uri = `${pdfDir.uri}${id}.pdf`;
    await writePdfBytes(uri, bytes);

    const now = new Date().toISOString();
    const safeName = fileName
      ? fileName.replace(/[^a-zA-Z0-9 _-]/g, "_") + ".pdf"
      : `compressed_${pdf.original_filename}`;
    const result: LocalPdf = {
      id,
      original_filename: safeName,
      file_size: bytes.length,
      page_count: compressed.page_count,
      uri,
      created_at: now,
      updated_at: now,
    };
    await savePdfLocally(result);
    return result;
  } catch (e) {
    console.error("Compress error:", e);
    return null;
  }
}

export interface OcrOutcome {
  pdf: LocalPdf;
  characterCount: number;
  alreadySearchable: boolean;
}

/**
 * Run OCR on a PDF via the cloud backend (Tesseract isn't bundleable in
 * Expo, so this is necessarily online-only, same as compressPdf).
 * Flow: upload local PDF → OCR on backend → download the result → save
 * locally as a new version. When the PDF is already searchable, the
 * backend returns it unchanged, so the "download" step just re-fetches the
 * same bytes — still saved as a new local copy for consistency with every
 * other cloud-backed operation here.
 */
export async function ocrPdf(pdfId: string, language = "eng"): Promise<OcrOutcome | null> {
  try {
    const pdf = await getLocalPdfById(pdfId);
    if (!pdf) return null;

    const uploaded = await api.uploadPdf(pdf.uri, pdf.original_filename, "application/pdf");
    const { pdf: ocrPdfDoc, character_count, already_searchable } = await api.ocrPdf(uploaded.id, language);

    const buffer = await api.downloadPdf(ocrPdfDoc.id);
    const bytes = new Uint8Array(buffer);

    const id = generateId();
    const pdfDir = getPdfDir();
    const uri = `${pdfDir.uri}${id}.pdf`;
    await writePdfBytes(uri, bytes);

    const now = new Date().toISOString();
    const result: LocalPdf = {
      id,
      original_filename: pdf.original_filename,
      file_size: bytes.length,
      page_count: ocrPdfDoc.page_count,
      uri,
      created_at: now,
      updated_at: now,
    };
    await savePdfLocally(result);
    return { pdf: result, characterCount: character_count, alreadySearchable: already_searchable };
  } catch (e) {
    console.error("OCR error:", e);
    return null;
  }
}

/**
 * Add an annotation to a PDF via the cloud backend (the annotation is burned
 * into the PDF, not a local-only overlay, so this has to go through the
 * same endpoint desktop/web use). Flow mirrors compressPdf/ocrPdf: upload →
 * annotate on backend → download → save locally as a new version.
 */
export async function addAnnotation(
  pdfId: string,
  req: {
    page: number;
    type: string;
    rect: number[];
    color?: string;
    content?: string | null;
    points?: number[][];
    opacity?: number;
  },
): Promise<LocalPdf | null> {
  try {
    const pdf = await getLocalPdfById(pdfId);
    if (!pdf) return null;

    const uploaded = await api.uploadPdf(pdf.uri, pdf.original_filename, "application/pdf");
    const annotated = await api.addAnnotation(uploaded.id, req);

    const buffer = await api.downloadPdf(annotated.id);
    const bytes = new Uint8Array(buffer);

    const id = generateId();
    const pdfDir = getPdfDir();
    const uri = `${pdfDir.uri}${id}.pdf`;
    await writePdfBytes(uri, bytes);

    const now = new Date().toISOString();
    const result: LocalPdf = {
      id,
      original_filename: pdf.original_filename,
      file_size: bytes.length,
      page_count: annotated.page_count,
      uri,
      created_at: now,
      updated_at: now,
    };
    await savePdfLocally(result);
    return result;
  } catch (e) {
    console.error("Annotation error:", e);
    return null;
  }
}

/**
 * Compress a PDF offline using pdf-lib re-save.
 *
 * pdf-lib does not support true compression, but re-saving the document
 * removes unused objects and metadata, producing a smaller file. This is a
 * partial compression that works fully offline (no cloud dependency).
 *
 * Returns the new LocalPdf, or null on failure.
 */
export async function compressPdfOffline(
  pdfId: string,
  quality: "low" | "medium" | "high" = "medium",
  fileName?: string,
): Promise<LocalPdf | null> {
  try {
    const pdf = await getLocalPdfById(pdfId);
    if (!pdf) return null;

    const bytes = await readPdfBytes(pdf.uri);
    const doc = await PDFDocument.load(bytes);

    // Remove metadata to reduce size (partial compression)
    doc.setTitle("");
    doc.setAuthor("");
    doc.setSubject("");
    doc.setKeywords([]);
    doc.setProducer("");
    doc.setCreator("");
    doc.setCreationDate(new Date(0));
    doc.setModificationDate(new Date(0));

    // Re-save with object compression (useObjectStreams) for smaller output
    const pdfBytes = await doc.save({
      useObjectStreams: quality === "low" || quality === "medium",
    });

    const pdfDir = getPdfDir();
    const id = generateId();
    const uri = `${pdfDir.uri}${id}.pdf`;
    await writePdfBytes(uri, pdfBytes);

    const now = new Date().toISOString();
    const safeName = fileName
      ? fileName.replace(/[^a-zA-Z0-9 _-]/g, "_") + ".pdf"
      : `compressed_${pdf.original_filename}`;
    const result: LocalPdf = {
      id,
      original_filename: safeName,
      file_size: pdfBytes.length,
      page_count: doc.getPageCount(),
      uri,
      created_at: now,
      updated_at: now,
    };
    await savePdfLocally(result);
    return result;
  } catch (e) {
    console.error("Compress offline error:", e);
    return null;
  }
}

/**
 * Export a PDF to another format (txt/png/jpg/svg).
 * Requires connection — downloads the converted file from the cloud and saves it locally.
 * Returns the saved file URI and name, or null on failure.
 */
export async function exportPdf(
  pdfId: string,
  format: string,
  baseName: string,
): Promise<{ uri: string; name: string } | null> {
  try {
    const buffer = await api.exportPdf(pdfId, format);
    const bytes = new Uint8Array(buffer);

    const id = generateId();
    const pdfDir = getPdfDir();
    const safeBase = baseName
      .replace(/\.pdf$/i, "")
      .replace(/[^a-zA-Z0-9 _-]/g, "_");
    const name = `${safeBase}.${format}`;
    const uri = `${pdfDir.uri}${id}.${format}`;
    await writePdfBytes(uri, bytes);

    return { uri, name };
  } catch (e) {
    console.error("Export error:", e);
    return null;
  }
}

/**
 * Import a file (txt/png/jpg/gif/bmp) and convert it to PDF.
 * Requires connection — uploads the file to the cloud and returns the created PDF.
 */
export async function importFile(
  fileUri: string,
  fileName: string,
  mimeType: string,
): Promise<LocalPdf | null> {
  try {
    const uploaded = await api.importFile(fileUri, fileName, mimeType);

    // Download the created PDF and save locally
    const buffer = await api.downloadPdf(uploaded.id);
    const bytes = new Uint8Array(buffer);

    const id = generateId();
    const pdfDir = getPdfDir();
    const uri = `${pdfDir.uri}${id}.pdf`;
    await writePdfBytes(uri, bytes);

    const now = new Date().toISOString();
    const result: LocalPdf = {
      id,
      original_filename: normalizeFilename(uploaded.original_filename),
      file_size: bytes.length,
      page_count: uploaded.page_count,
      uri,
      created_at: now,
      updated_at: now,
    };
    await savePdfLocally(result);
    return result;
  } catch (e) {
    console.error("Import error:", e);
    return null;
  }
}