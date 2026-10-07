"use client";

// Logica di stampa dell'editor desktop (anteprima + invio al printer),
// estratta da useEditorState per mantenerlo sotto le 400 righe (file lunghi,
// refactor/long-files-t6-desktophooks).

import type React from "react";
import type { PrintOptions } from "../components/PrintOptionsModal";
import { tauriInvoke } from "../shared/tauri";
import { renderPagesToPngBase64, printCurrentPageViaBrowser } from "../lib/printing";
import type { PdfDocument } from "../shared/types";

export interface UseEditorPrintContext {
  selectedDoc: PdfDocument | null;
  pdfUrl: string | null;
  printPreview: { dataUrl: string; isLandscape: boolean } | null;
  setPrintPreview: React.Dispatch<
    React.SetStateAction<{ dataUrl: string; isLandscape: boolean } | null>
  >;
  setPrintOptionsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface EditorPrint {
  handlePrint: () => void;
  executePrint: (options: PrintOptions) => Promise<void>;
}

export function useEditorPrint(ctx: UseEditorPrintContext): EditorPrint {
  const { selectedDoc, pdfUrl, printPreview, setPrintPreview, setPrintOptionsOpen } = ctx;

  function handlePrint() {
    if (!selectedDoc) return;
    const srcCanvas = document.querySelector("canvas");
    if (!srcCanvas) return;
    setPrintPreview({
      dataUrl: srcCanvas.toDataURL("image/png"),
      isLandscape: srcCanvas.width > srcCanvas.height,
    });
    setPrintOptionsOpen(true);
  }

  async function executePrint(options: PrintOptions) {
    setPrintOptionsOpen(false);
    if (!printPreview || !selectedDoc) return;

    // No printer chosen (browser/dev fallback, or the platform doesn't
    // support silent printing): fall back to the standard print flow,
    // limited to the currently visible page.
    if (!options.printerName) {
      await printCurrentPageViaBrowser(printPreview.dataUrl, printPreview.isLandscape, options);
      return;
    }

    try {
      const totalPages = selectedDoc.page_count || 1;
      const { parsePageRangeList } = await import("../components/PrintOptionsModal");
      const pageNumbers = parsePageRangeList(options.pageRange, totalPages);
      if (!pdfUrl) return;
      const { images, firstIsLandscape } = await renderPagesToPngBase64(pdfUrl, pageNumbers);
      if (images.length === 0) return;

      const pageOrientation =
        options.orientation === "auto" ? (firstIsLandscape ? "landscape" : "portrait") : options.orientation;
      const marginMm = options.margin === "none" ? 0 : 12;

      await tauriInvoke("print_pages", {
        request: {
          printerName: options.printerName,
          copies: options.copies,
          color: options.color === "color",
          orientation: pageOrientation,
          marginMm,
          images,
        },
      });
    } catch (err) {
      console.error("Print failed:", err);
    }
  }

  return { handlePrint, executePrint };
}