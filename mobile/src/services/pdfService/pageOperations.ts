/**
 * Page-structure operations on local PDFs: merge, split, reorder, remove pages.
 */
import { PDFDocument } from "@cantoo/pdf-lib";
import { getLocalPdfById, savePdfLocally } from "../localDb";
import type { LocalPdf } from "../../shared/types";
import { generateId, getPdfDir, readPdfBytes, writePdfBytes } from "./io";

export async function mergePdfs(
  pdfIds: string[],
  fileName?: string,
  userId?: string,
): Promise<LocalPdf | null> {
  if (pdfIds.length < 2) return null;
  try {
    const mergedPdf = await PDFDocument.create();

    // Get source PDF to inherit user_id
    const firstSource = await getLocalPdfById(pdfIds[0]);
    const sourceUserId = firstSource?.user_id || userId || "";

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
    const safeName = fileName
      ? fileName.replace(/[^a-zA-Z0-9 _-]/g, "_") + ".pdf"
      : `merged_${now.slice(0, 10)}.pdf`;
    const result: LocalPdf = {
      id,
      user_id: sourceUserId,
      original_filename: safeName,
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
  fileName?: string,
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
      const safeName = fileName
        ? fileName.replace(/[^a-zA-Z0-9 _-]/g, "_") + `_${i + 1}.pdf`
        : `split_${i + 1}_${now.slice(0, 10)}.pdf`;
      const result: LocalPdf = {
        id,
        original_filename: safeName,
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
  fileName?: string,
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
    const safeName = fileName
      ? fileName.replace(/[^a-zA-Z0-9 _-]/g, "_") + ".pdf"
      : `reordered_${now.slice(0, 10)}.pdf`;
    const result: LocalPdf = {
      id,
      user_id: pdf.user_id ?? "",
      original_filename: safeName,
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

export async function removePages(
  pdfId: string,
  pagesToRemove: number[],
  fileName?: string,
): Promise<LocalPdf | null> {
  try {
    const pdf = await getLocalPdfById(pdfId);
    if (!pdf) return null;

    const bytes = await readPdfBytes(pdf.uri);
    const source = await PDFDocument.load(bytes);
    const newPdf = await PDFDocument.create();

    const allPages = source.getPageIndices();
    const keepPages = allPages.filter((p) => !pagesToRemove.includes(p + 1));
    const pages = await newPdf.copyPages(source, keepPages);
    pages.forEach((page) => newPdf.addPage(page));

    const pdfBytes = await newPdf.save();

    const pdfDir = getPdfDir();
    const id = generateId();
    const uri = `${pdfDir.uri}${id}.pdf`;
    await writePdfBytes(uri, pdfBytes);

    const now = new Date().toISOString();
    const safeName = fileName
      ? fileName.replace(/[^a-zA-Z0-9 _-]/g, "_") + ".pdf"
      : `removed-pages_${now.slice(0, 10)}.pdf`;
    const result: LocalPdf = {
      id,
      user_id: pdf.user_id ?? "",
      original_filename: safeName,
      file_size: pdfBytes.length,
      page_count: newPdf.getPageCount(),
      uri,
      created_at: now,
      updated_at: now,
    };
    await savePdfLocally(result);
    return result;
  } catch (e) {
    console.error("Remove pages error:", e);
    return null;
  }
}