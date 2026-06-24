"use client";

import React from "react";

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
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [rendering, setRendering] = React.useState(false);
  const [pdfJsLoaded, setPdfJsLoaded] = React.useState(false);
  const [loadVersion, setLoadVersion] = React.useState(0);
  const pdfDocRef = React.useRef<any>(null);
  const renderTaskRef = React.useRef<any>(null);

  // Load PDF.js on mount
  React.useEffect(() => {
    // If already loaded (e.g., by another instance), skip
    if ((window as any).pdfjsLib) {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      setPdfJsLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.async = true;
    script.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      setPdfJsLoaded(true);
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Load PDF document when fileUrl changes (or when pdfjsLib finishes loading)
  React.useEffect(() => {
    if (!fileUrl || !pdfJsLoaded) return;

    const loadPdf = async () => {
      try {
        const pdf = await (window as any).pdfjsLib.getDocument(fileUrl).promise;
        pdfDocRef.current = pdf;
        onTotalPagesChange(pdf.numPages);
        onPageChange(1);
        onZoomChange(1);
        // Force render effect to run even if currentPage is already 1
        setLoadVersion((v) => v + 1);
      } catch (err) {
        console.error("Failed to load PDF:", err);
      }
    };
    loadPdf();

    return () => {
      pdfDocRef.current = null;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [fileUrl, pdfJsLoaded]);

  // Render page when page or zoom changes
  React.useEffect(() => {
    if (!pdfDocRef.current || !canvasRef.current) return;

    const renderPage = async () => {
      setRendering(true);
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      try {
        const page = await pdfDocRef.current.getPage(currentPage);
        const viewport = page.getViewport({ scale: zoom });
        const canvas = canvasRef.current!;

        // devicePixelRatio for crisp rendering on HiDPI screens
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
      <div className="text-center text-gray-400">
        <div className="text-6xl mb-4">📄</div>
        <p>Select a PDF to view</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {rendering && (
        <div className="text-sm text-gray-400 mb-2">Rendering...</div>
      )}
      <div ref={containerRef} className="w-full h-full flex items-center justify-center overflow-auto">
        <canvas ref={canvasRef} className="shadow-lg" />
      </div>
    </div>
  );
}