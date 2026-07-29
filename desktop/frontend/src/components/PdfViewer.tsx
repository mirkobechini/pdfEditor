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
    const [rendering, setRendering] = React.useState(false);
    const [pdfJsLoaded, setPdfJsLoaded] = React.useState(false);
    const [loadVersion, setLoadVersion] = React.useState(0);
    const pdfDocRef = React.useRef<any>(null);
    const renderTaskRef = React.useRef<{ cancel: () => void } | null>(null);
    const renderKeyRef = React.useRef(0);

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

                const ctx = canvas.getContext("2d")!;
                ctx.scale(dpr, dpr);
                const renderTask = page.render({
                    canvasContext: ctx,
                    viewport,
                });
                renderTaskRef.current = renderTask;
                await renderTask.promise;
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
        <div className="relative flex w-full items-start justify-center">
            {rendering && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#f6f6f6]/80">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#f7871f] border-t-transparent" />
                </div>
            )}
            <canvas ref={canvasRef} className="shadow-lg" />
        </div>
    );
}