/**
 * Print service — isolated in its own module so expo-print (which requires
 * a native module) is only loaded when the viewer screen needs it, not at
 * app startup. Importing expo-print statically in pdfService.ts caused an
 * infinite loading loop in the editor.
 */
import { printAsync, Orientation } from "expo-print";
import { PDFDocument } from "@cantoo/pdf-lib";
import { File, Paths } from "expo-file-system";
import { readPdfBytes, writePdfBytes } from "./pdfService";
import { parsePageRangeList } from "../shared/print";

export type PrintOrientation = "auto" | "portrait" | "landscape";

export interface PrintOptions {
  /** "" means all pages; otherwise a range string like "1-3,5". */
  pageRange: string;
  orientation: PrintOrientation;
}

/**
 * Print a PDF using the native print dialog (iOS AirPrint / Android print
 * framework).
 *
 * Unlike desktop/web there's no color (grayscale) option here: pdf-lib can
 * select/copy pages but can't rasterize or recolor PDF content, and doing
 * that on-device would mean rendering every page to an image first — too
 * heavy for a "before printing" step on mobile. Color is left to the native
 * print dialog, same as it always was.
 *
 * Page range IS achievable (pdf-lib can build a page subset), so when the
 * user picks a range narrower than the full document, a temporary filtered
 * copy is built and printed instead of the original. Orientation is passed
 * through to expo-print, which — per its own docs — only honors it on iOS;
 * elsewhere it's a harmless no-op and the native dialog decides.
 */
export async function printPdf(uri: string, totalPages: number, options?: PrintOptions): Promise<boolean> {
  let tempFile: File | null = null;
  try {
    let printUri = uri;

    const pageRange = options?.pageRange ?? "";
    if (pageRange && totalPages > 0) {
      const pageNumbers = parsePageRangeList(pageRange, totalPages);
      if (pageNumbers.length < totalPages) {
        const bytes = await readPdfBytes(uri);
        const source = await PDFDocument.load(bytes);
        const filtered = await PDFDocument.create();
        const pages = await filtered.copyPages(source, pageNumbers.map((p) => p - 1));
        pages.forEach((page) => filtered.addPage(page));
        const filteredBytes = await filtered.save();

        tempFile = new File(Paths.cache, `print-${Date.now()}.pdf`);
        await writePdfBytes(tempFile.uri, filteredBytes);
        printUri = tempFile.uri;
      }
    }

    const orientation = options?.orientation;
    await printAsync({
      uri: printUri,
      ...(orientation === "portrait" ? { orientation: Orientation.portrait } : {}),
      ...(orientation === "landscape" ? { orientation: Orientation.landscape } : {}),
    });
    return true;
  } catch (e) {
    console.error("Print error:", e);
    return false;
  } finally {
    if (tempFile) {
      try {
        tempFile.delete();
      } catch {
        // Cache dir cleanup is best-effort — the OS reclaims it anyway.
      }
    }
  }
}
