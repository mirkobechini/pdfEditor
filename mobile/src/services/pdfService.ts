/**
 * Local PDF editing operations using pdf-lib.
 * All operations work offline — no backend needed.
 */
import { PDFDocument } from "pdf-lib";
import { File, Directory, Paths } from "expo-file-system";
import { writeAsStringAsync, EncodingType } from "expo-file-system/legacy";
import { getLocalPdfById, savePdfLocally } from "./localDb";
import type { LocalPdf } from "../shared/types";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

async function readPdfBytes(uri: string): Promise<Uint8Array> {
  const file = new File(uri);
  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer);
}

async function writePdfBytes(uri: string, bytes: Uint8Array): Promise<void> {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  await writeAsStringAsync(uri, base64, { encoding: EncodingType.Base64 });
}

function getPdfDir(): Directory {
  const dir = new Directory(Paths.document, "pdfs");
  if (!dir.exists) dir.create();
  return dir;
}

export async function mergePdfs(pdfIds: string[]): Promise<LocalPdf | null> {
  if (pdfIds.length < 2) return null;
  try {
    const mergedPdf = await PDFDocument.create();

    for (const id of pdfIds) {
      const pdf = await getLocalPdfById(id);
      if (!pdf) continue;
      const bytes = await readPdfBytes(pdf.uri);
      const source = await PDFDocument.load(bytes);
      const pages = await mergedPdf.copyPages(source, source.getPageIndices());
      pages.forEach((page) => mergedPdf.addPage(page));
    }

    const pdfBytes = await mergedPdf.save();

    // Save result
    const pdfDir = getPdfDir();

    const id = generateId();
    const uri = `${pdfDir.uri}${id}.pdf`;
    await writePdfBytes(uri, pdfBytes);

    const now = new Date().toISOString();
    const result: LocalPdf = {
      id,
      original_filename: `merged_${now.slice(0, 10)}.pdf`,
      file_size: pdfBytes.length,
      page_count: mergedPdf.getPageCount(),
      uri,
      created_at: now,
      updated_at: now,
    };
    await savePdfLocally(result);
    return result;
  } catch (e) {
    console.error("Merge error:", e);
    return null;
  }
}

export async function splitPdf(
  pdfId: string,
  pageRanges: [number, number][],
): Promise<LocalPdf[]> {
  try {
    const pdf = await getLocalPdfById(pdfId);
    if (!pdf) return [];

    const bytes = await readPdfBytes(pdf.uri);
    const source = await PDFDocument.load(bytes);
    const results: LocalPdf[] = [];
    const pdfDir = getPdfDir();

    for (let i = 0; i < pageRanges.length; i++) {
      const [start, end] = pageRanges[i];
      const newPdf = await PDFDocument.create();
      const pageIndices: number[] = [];
      for (let p = start - 1; p < end; p++) {
        if (p >= 0 && p < source.getPageCount()) pageIndices.push(p);
      }
      const pages = await newPdf.copyPages(source, pageIndices);
      pages.forEach((page) => newPdf.addPage(page));
      const pdfBytes = await newPdf.save();

      const id = generateId();
      const uri = `${pdfDir.uri}${id}.pdf`;
      await writePdfBytes(uri, pdfBytes);

      const now = new Date().toISOString();
      const result: LocalPdf = {
        id,
        original_filename: `split_${i + 1}_${now.slice(0, 10)}.pdf`,
        file_size: pdfBytes.length,
        page_count: newPdf.getPageCount(),
        uri,
        created_at: now,
        updated_at: now,
      };
      await savePdfLocally(result);
      results.push(result);
    }
    return results;
  } catch (e) {
    console.error("Split error:", e);
    return [];
  }
}

export async function reorderPages(
  pdfId: string,
  pageOrder: number[],
): Promise<LocalPdf | null> {
  try {
    const pdf = await getLocalPdfById(pdfId);
    if (!pdf) return null;

    const bytes = await readPdfBytes(pdf.uri);
    const source = await PDFDocument.load(bytes);
    const newPdf = await PDFDocument.create();

    const zeroBased = pageOrder.map((p) => p - 1);
    const pages = await newPdf.copyPages(source, zeroBased);
    pages.forEach((page) => newPdf.addPage(page));

    const pdfBytes = await newPdf.save();

    const pdfDir = getPdfDir();
    const id = generateId();
    const uri = `${pdfDir.uri}${id}.pdf`;
    await writePdfBytes(uri, pdfBytes);

    const now = new Date().toISOString();
    const result: LocalPdf = {
      id,
      original_filename: `reordered_${now.slice(0, 10)}.pdf`,
      file_size: pdfBytes.length,
      page_count: newPdf.getPageCount(),
      uri,
      created_at: now,
      updated_at: now,
    };
    await savePdfLocally(result);
    return result;
  } catch (e) {
    console.error("Reorder error:", e);
    return null;
  }
}

export async function updateMetadata(
  pdfId: string,
  title?: string,
  author?: string,
): Promise<LocalPdf | null> {
  try {
    const pdf = await getLocalPdfById(pdfId);
    if (!pdf) return null;

    const bytes = await readPdfBytes(pdf.uri);
    const doc = await PDFDocument.load(bytes);

    if (title !== undefined) doc.setTitle(title);
    if (author !== undefined) doc.setAuthor(author);

    const pdfBytes = await doc.save();
    await writePdfBytes(pdf.uri, pdfBytes);

    const now = new Date().toISOString();
    const updated = {
      ...pdf,
      title: title ?? pdf.title,
      author: author ?? pdf.author,
      updated_at: now,
      file_size: pdfBytes.length,
    };
    await savePdfLocally(updated);
    return updated;
  } catch (e) {
    console.error("Metadata error:", e);
    return null;
  }
}
