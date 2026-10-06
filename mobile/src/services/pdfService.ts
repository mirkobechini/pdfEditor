/**
 * Local PDF editing operations using pdf-lib.
 * All operations work offline — no backend needed.
 *
 * Facade module: re-exports each operation from its dedicated submodule so
 * the public interface stays identical for all existing callers.
 */
export { normalizeFilename, readPdfBytes, writePdfBytes } from "./pdfService/io";
export {
  mergePdfs,
  splitPdf,
  reorderPages,
  removePages,
} from "./pdfService/pageOperations";
export {
  updateMetadata,
  isPdfEncrypted,
  protectPdf,
  unlockPdf,
  signPdf,
} from "./pdfService/security";
export {
  compressPdf,
  compressPdfOffline,
  ocrPdf,
  addAnnotation,
  exportPdf,
  importFile,
} from "./pdfService/cloud";
export type { OcrOutcome } from "./pdfService/cloud";