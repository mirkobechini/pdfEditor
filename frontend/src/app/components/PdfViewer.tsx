"use client";

import React from "react";
import { useTranslations } from "next-intl";

interface PdfViewerProps {
  fileUrl: string | null;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onTotalPagesChange: (total: number) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onFileDrop?: (file: File) => void;
}

export default function PdfViewer({
  fileUrl,
  currentPage,
  totalPages,
  onPageChange,
  onTotalPagesChange,
  zoom,
  onZoomChange,
  onFileDrop,
}: PdfViewerProps) {
  const t = useTranslations("app");
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [rendering, setRendering] = React.useState(false);
  const [pdfJsLoaded, setPdfJsLoaded] = React.useState(false);
  const [loadVersion, setLoadVersion] = React.useState(0);
  const [dragOver, setDragOver] = React.useState(false);
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
      <div
        className={`flex flex-col items-center justify-center h-full min-h-[300px] border-2 border-dashed rounded-lg transition-colors ${
          dragOver
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-600"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file && file.name.toLowerCase().endsWith(".pdf")) {
            onFileDrop?.(file);
          } else {
            alert(t("uploadOnlyPdf"));
          }
        }}
      >
        <div className="text-6xl mb-4">
          {dragOver ? "📥" : "📄"}
        </div>
        <p className="text-gray-400 text-center">
          {dragOver ? t("dropToUpload") : t("selectPdf")}
        </p>
        <p className="text-xs text-gray-500 mt-2">{t("dragAndDrop")}</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-full flex flex-col items-center"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file && file.name.toLowerCase().endsWith(".pdf")) {
          onFileDrop?.(file);
        }
      }}
    >
      {rendering && (
        <div className="text-sm text-gray-400 mb-2">{t("rendering")}</div>
      )}
      {/* Drag-over overlay */}
      {dragOver && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-lg pointer-events-none">
          <div className="text-center">
            <div className="text-4xl mb-2">📥</div>
            <p className="text-blue-500 font-medium">{t("dropToUpload")}</p>
          </div>
        </div>
      )}
      <div ref={containerRef} className="flex items-center justify-center relative">
        <canvas ref={canvasRef} className="shadow-lg" />
      </div>
    </div>
  );
}