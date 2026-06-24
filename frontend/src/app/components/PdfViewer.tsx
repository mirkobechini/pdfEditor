"use client";

import React from "react";

interface PdfViewerProps {
  fileUrl: string | null;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

export default function PdfViewer({
  fileUrl,
  currentPage,
  totalPages,
  onPageChange,
  zoom,
  onZoomChange,
}: PdfViewerProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [rendering, setRendering] = React.useState(false);
  const pdfDocRef = React.useRef<any>(null);
  const renderTaskRef = React.useRef<any>(null);

  // Load PDF.js on mount
  React.useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Load PDF document when fileUrl changes
  React.useEffect(() => {
    if (!fileUrl || !(window as any).pdfjsLib) return;

    const loadPdf = async () => {
      try {
        const pdf = await (window as any).pdfjsLib.getDocument(fileUrl).promise;
        pdfDocRef.current = pdf;
        onPageChange(1);
        onZoomChange(1);
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
  }, [fileUrl]);

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
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext("2d")!;
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
  }, [currentPage, zoom]);

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
      <canvas ref={canvasRef} className="shadow-lg" />
    </div>
  );
}