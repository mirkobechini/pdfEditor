import type { PrintOptions } from "../components/PrintOptionsModal";

/** Render the given PDF pages to PNG data URLs via pdf.js. */
export async function renderPagesToDataUrls(
    pdfUrl: string,
    pageNumbers: number[],
): Promise<{ dataUrls: string[]; firstIsLandscape: boolean }> {
    const pdfjsLib = (window as any).pdfjsLib;
    const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
    const dataUrls: string[] = [];
    let firstIsLandscape = false;
    const PRINT_SCALE = 2; // ~144 DPI at the PDF's native 72pt/inch base
    for (let i = 0; i < pageNumbers.length; i++) {
        const page = await pdf.getPage(pageNumbers[i]);
        const viewport = page.getViewport({ scale: PRINT_SCALE });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (i === 0) firstIsLandscape = viewport.width > viewport.height;
        dataUrls.push(canvas.toDataURL("image/png"));
    }
    return { dataUrls, firstIsLandscape };
}

/**
 * Prints one or more pre-rendered page images via the browser's native print
 * dialog: builds a full-page overlay (one image per printed page, in order),
 * applies orientation/margin/grayscale, and calls window.print(). Mirrors
 * the desktop app's browser/dev fallback, extended to multiple pages.
 */
export async function printPagesInBrowser(
    dataUrls: string[],
    firstIsLandscape: boolean,
    options: PrintOptions,
): Promise<void> {
    if (dataUrls.length === 0) return;

    // WebView/browser print pipelines can snapshot the DOM before an <img>
    // has finished decoding its data URL, producing a blank page. Decode
    // every image up front, THEN insert them into the document.
    const images = await Promise.all(
        dataUrls.map(async (src) => {
            const img = new Image();
            img.src = src;
            try {
                await img.decode();
            } catch {
                await new Promise<void>((resolve) => {
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                });
            }
            return img;
        }),
    );

    const pageOrientation =
        options.orientation === "auto" ? (firstIsLandscape ? "landscape" : "portrait") : options.orientation;
    const pageMargin = options.margin === "none" ? "0" : "1.2cm";
    const grayscale = options.color === "grayscale";

    const style = document.createElement("style");
    style.id = "print-style";
    style.textContent = `
        @media print {
            body > *:not(#print-overlay) { display: none !important; }
            @page { size: ${pageOrientation}; margin: ${pageMargin}; }
            #print-overlay {
                display: block !important;
                position: fixed !important;
                inset: 0 !important;
                z-index: 99999 !important;
                background: white !important;
            }
            #print-overlay img {
                display: block;
                width: 100%;
                height: auto;
                page-break-after: always;
                ${grayscale ? "filter: grayscale(1);" : ""}
            }
            #print-overlay img:last-child { page-break-after: auto; }
        }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement("div");
    overlay.id = "print-overlay";
    overlay.style.cssText = "display:none;";
    for (const img of images) overlay.appendChild(img);
    document.body.appendChild(overlay);

    const cleanup = () => {
        const s = document.getElementById("print-style");
        if (s) document.head.removeChild(s);
        const o = document.getElementById("print-overlay");
        if (o) document.body.removeChild(o);
        window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    // Safety net in case `afterprint` doesn't fire in every browser.
    setTimeout(cleanup, 15000);

    // Two animation frames give the browser time to lay out and paint the
    // decoded images before the print snapshot is taken.
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            window.print();
        });
    });
}
