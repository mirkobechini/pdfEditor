// Stampo PDF — funzioni pure estratte da app/app/page.tsx (issue #881, T2).
// Queste due funzioni NON dipendono dallo stato del componente: vengono
// chiamate con parametri espliciti. Implementano lo print flow desktop.

import type { PrintOptions } from "../components/PrintOptionsModal";

/** Render the given PDF pages to PNG (base64, no data: prefix) via pdf.js. */
export async function renderPagesToPngBase64(
    fileUrl: string,
    pageNumbers: number[]
): Promise<{ images: string[]; firstIsLandscape: boolean }> {
    const pdfjsLib = (window as any).pdfjsLib;
    const pdf = await pdfjsLib.getDocument(fileUrl).promise;
    const images: string[] = [];
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
        images.push(canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, ""));
    }
    return { images, firstIsLandscape };
}

/** Browser/dev fallback: prints only the currently visible page via window.print(). */
export async function printCurrentPageViaBrowser(dataUrl: string, isLandscapeImage: boolean, options: PrintOptions) {
    // WebView2's print pipeline snapshots the DOM synchronously. If the
    // <img> hasn't finished decoding the data URL yet, the snapshot is
    // blank. Build a real Image, await decode(), THEN insert it and wait
    // a couple of frames for layout/paint before calling print().
    const img = new Image();
    img.src = dataUrl;
    try {
        await img.decode();
    } catch {
        // Fall back to the load event if decode() is unsupported/fails.
        await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
        });
    }

    const pageOrientation =
        options.orientation === "auto" ? (isLandscapeImage ? "landscape" : "portrait") : options.orientation;
    const pageMargin = options.margin === "none" ? "0" : "1.2cm";

    const style = document.createElement("style");
    style.id = "print-style";
    style.textContent = `
        @media print {
            body > *:not(#print-overlay) { display: none !important; }
            @page { size: ${pageOrientation}; margin: ${pageMargin}; }
            #print-overlay {
                display: flex !important;
                position: fixed !important;
                inset: 0 !important;
                z-index: 99999 !important;
                align-items: center !important;
                justify-content: center !important;
                background: white !important;
            }
            #print-overlay img {
                max-width: 100%;
                max-height: 100vh;
                object-fit: contain;
            }
        }
    `;
    document.head.appendChild(style);

    const div = document.createElement("div");
    div.id = "print-overlay";
    div.style.cssText = "display:none;";
    div.appendChild(img);
    document.body.appendChild(div);

    const cleanup = () => {
        const s = document.getElementById("print-style");
        if (s) document.head.removeChild(s);
        const d = document.getElementById("print-overlay");
        if (d) document.body.removeChild(d);
        window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    // Safety net in case `afterprint` doesn't fire (some WebView2 builds).
    setTimeout(cleanup, 15000);

    // Two animation frames give WebView2 time to lay out and paint the
    // decoded image before the print snapshot is taken.
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            window.print();
        });
    });
}