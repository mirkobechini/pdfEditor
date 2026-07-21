/** Type augmentation for PDF.js loaded via CDN script. */

interface PdfJsPage {
  getViewport(opts: { scale: number }): { width: number; height: number };
  render(opts: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
  }): { promise: Promise<void>; cancel: () => void };
}

interface PdfJsDoc {
  numPages: number;
  getPage(n: number): Promise<PdfJsPage>;
}

interface PdfJsLib {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument(source: string | URL | ArrayBuffer | { data: ArrayBuffer }): {
    promise: Promise<PdfJsDoc>;
  };
}

declare global {
  interface Window {
    pdfjsLib: PdfJsLib;
  }
}
