"use client";

import React from "react";

const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

interface PdfViewerProps {
    fileUrl: string | null;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onTotalPagesChange: (total: number) => void;
    zoom: number;
    onZoomChange: (zoom: number) => void;
}

export default function PdfViewer({
    fileUrl,
    currentPage,
    totalPages,
    onPageChange,
    onTotalPagesChange,
    zoom,
    onZoomChange,
}: PdfViewerProps) {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const pageWrapRef = React.useRef<HTMLDivElement>(null);
    const textLayerRef = React.useRef<HTMLDivElement>(null);
    const [rendering, setRendering] = React.useState(false);
    const [pdfJsLoaded, setPdfJsLoaded] = React.useState(false);
    const [loadVersion, setLoadVersion] = React.useState(0);
    const pdfDocRef = React.useRef<any>(null);
    const renderTaskRef = React.useRef<{ cancel: () => void } | null>(null);
    const renderKeyRef = React.useRef(0);

    // 10/11 (Mirko): il viewer deve rendere selezionabile il testo. pdf.js
    // renderTextLayer genera span assoluti; con color:transparent restano
    // invisibili ma selezionabili/ricercabili (la selezione ha l'highlight).
    // 11/11 (Mirko): CSS UFFICIALE di pdf.js per il text layer (obbligatorio:
    // senza, gli span vengono aggiunti al DOM ma non posizionati/selezionabili).
    const TEXT_LAYER_CSS = `
        .pdfmin-text-layer{position:absolute;text-align:initial;left:0;top:0;right:0;bottom:0;overflow:auto;line-height:1;transform-origin:0 0;user-select:text;}
        .pdfmin-text-layer span{position:absolute;white-space:pre;transform-origin:0 0;color:rgba(200,40,40,.55);cursor:text;}
        .pdfmin-text-layer span::selection{background:rgba(247,135,31,.7);}
        .pdfmin-text-layer ::selection{background:rgba(247,135,31,.7);}
    `;

    // Load PDF.js on mount
    React.useEffect(() => {
        if ((window as any).pdfjsLib) {
            (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
            setPdfJsLoaded(true);
            return;
        }

        const script = document.createElement("script");
        script.src = PDFJS_URL;
        script.async = true;
        script.onload = () => {
            (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
            setPdfJsLoaded(true);
        };
        document.body.appendChild(script);
    }, []);

    // Load PDF document when fileUrl changes
    React.useEffect(() => {
        if (!fileUrl || !pdfJsLoaded) return;

        let cancelled = false;
        const loadPdf = async () => {
            try {
                const pdf = await (window as any).pdfjsLib.getDocument(fileUrl).promise;
                if (cancelled) return;
                pdfDocRef.current = pdf;
                onTotalPagesChange(pdf.numPages);
                onPageChange(1);
                onZoomChange(1);
                setLoadVersion((v) => v + 1);
            } catch (err) {
                console.error("Failed to load PDF:", err);
            }
        };
        loadPdf();

        return () => {
            cancelled = true;
            pdfDocRef.current = null;
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
            }
        };
    }, [fileUrl, pdfJsLoaded]);

    // Render page when page or zoom changes
    React.useEffect(() => {
        if (!pdfDocRef.current || !canvasRef.current) return;

        const key = ++renderKeyRef.current;
        const renderPage = async () => {
            setRendering(true);
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
            }

            const doc = pdfDocRef.current;
            if (!doc) return;

            try {
                const page = await doc.getPage(currentPage);
                if (key !== renderKeyRef.current) return;
                if (!canvasRef.current?.isConnected) return;

                const viewport = page.getViewport({ scale: zoom });
                const canvas = canvasRef.current!;

                const dpr = window.devicePixelRatio || 1;
                canvas.width = viewport.width * dpr;
                canvas.height = viewport.height * dpr;
                canvas.style.width = `${viewport.width}px`;
                canvas.style.height = `${viewport.height}px`;

                const ctx = canvas.getContext("2d");
                if (!ctx) return;
                ctx.scale(dpr, dpr);
                const renderTask = page.render({
                    canvasContext: ctx,
                    viewport,
                });
                renderTaskRef.current = renderTask;
                await renderTask.promise;

                // text layer: rende il testo selezionabile/cercabile
                try {
                    const wrap = pageWrapRef.current;
                    const tl = textLayerRef.current;
                    if (wrap && tl && (window as any).pdfjsLib) {
                        wrap.style.width = `${viewport.width}px`;
                        wrap.style.height = `${viewport.height}px`;
                        tl.style.left = "0px";
                        tl.style.top = "0px";
                        tl.style.width = `${viewport.width}px`;
                        tl.style.height = `${viewport.height}px`;
                        tl.innerHTML = "";
                        const pdfjs = (window as any).pdfjsLib;
                        // API ufficiale 3.x: classe TextLayer con stream + render
                        let textLayer: any = null;
                        if (typeof pdfjs.TextLayer === "function") {
                            textLayer = new pdfjs.TextLayer({
                                textContentSource: page.streamTextContent({ includeMarkedContent: true }),
                                container: tl,
                                viewport,
                            });
                            if (typeof textLayer.render === "function") {
                                await textLayer.render();
                            } else if (typeof textLayer.setupTextLayout === "function") {
                                const tc = await page.getTextContent();
                                textLayer.setTextContent(tc);
                                textLayer.render();
                            }
                        } else {
                            // fallback vintage (renderTextLayer util)
                            const textContent = await page.getTextContent();
                            pdfjs.renderTextLayer({ textContent, container: tl, viewport, textDivs: [] as HTMLElement[] });
                        }
                    }
                } catch (tlErr) {
                    // il text layer è un miglioramento: se fallisce, la pagina resta visibile
                    console.error("text layer error:", tlErr);
                }
            } catch (err: any) {
                if (err?.name !== "RenderingCancelledException") {
                    if (err?.message?.includes("Node cannot be found")) return;
                    console.error("Render error:", err);
                }
            } finally {
                setRendering(false);
            }
        };
        renderPage();
    }, [currentPage, zoom, loadVersion]);

    if (!fileUrl) {
        return (
            <div className="flex h-full items-center justify-center text-[#7e7267] text-sm">
                Seleziona un PDF per visualizzarlo
            </div>
        );
    }

    return (
        <div className="relative flex h-full w-full items-start justify-center overflow-auto p-4">
            <style>{TEXT_LAYER_CSS}</style>
            {rendering && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0f0d0b]/80">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#f7871f] border-t-transparent" />
                </div>
            )}
            <div ref={pageWrapRef} className="relative shrink-0">
                <canvas ref={canvasRef} className="block shadow-2xl" />
                <div ref={textLayerRef} className="pdfmin-text-layer" />
            </div>
        </div>
    );
}