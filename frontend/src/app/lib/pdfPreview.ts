/**
 * Utility to render the first page of a PDF to a data URL using PDF.js
 * This is used for generating thumbnails/previews in the DeleteModal
 */

export async function renderFirstPageToDataUrl(pdfUrl: string): Promise<string> {
  // Ensure PDF.js is loaded
  if (!(window as any).pdfjsLib) {
    await loadPdfJs();
  }

  const pdfjsLib = (window as any).pdfjsLib;

  // Load the PDF document
  const pdf = await pdfjsLib.getDocument(pdfUrl).promise;

  // Get the first page
  const page = await pdf.getPage(1);

  // Create a canvas to render to
  const canvas = document.createElement("canvas");
  const viewport = page.getViewport({ scale: 0.5 }); // Scale down for thumbnail

  // Set canvas dimensions
  const dpr = window.devicePixelRatio || 1;
  canvas.width = viewport.width * dpr;
  canvas.height = viewport.height * dpr;
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;

  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  // Render the page
  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise;

  // Convert to data URL
  return canvas.toDataURL("image/png");
}

async function loadPdfJs(): Promise<void> {
  return new Promise((resolve, reject) => {
    // If already loaded, resolve immediately
    if ((window as any).pdfjsLib) {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.async = true;
    script.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load PDF.js"));
    document.body.appendChild(script);
  });
}