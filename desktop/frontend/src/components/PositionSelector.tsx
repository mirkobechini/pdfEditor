"use client";

import React from "react";

const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

interface PositionSelectorProps {
    pdfUrl: string | null;
    pageNumber: number;
    /** Default box size in PDF points (width, height). */
    boxSize?: { width: number; height: number };
    /** Called with the top-left position in PDF points. */
    onPositionChange: (x: number, y: number) => void;
}

/**
 * Renders a mini preview of a PDF page and lets the user drag a box to
 * choose where to place a signature/annotation. Reports the box's top-left
 * position in PDF points (the coordinate system used by the backend).
 */
export default function PositionSelector({
    pdfUrl,
    pageNumber,
    boxSize = { width: 200, height: 80 },
    onPositionChange,
}: PositionSelectorProps) {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const boxRef = React.useRef<HTMLDivElement>(null);
    const [pdfJsLoaded, setPdfJsLoaded] = React.useState(false);
    const [pageSize, setPageSize] = React.useState<{ width: number; height: number } | null>(null);
    const [boxPos, setBoxPos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [dragging, setDragging] = React.useState(false);
    const dragOffsetRef = React.useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
    const pdfDocRef = React.useRef<any>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);

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

    // Load PDF document and render the page
    React.useEffect(() => {
        if (!pdfUrl || !pdfJsLoaded) return;
        let cancelled = false;

        const loadAndRender = async () => {
            try {
                const pdf = await (window as any).pdfjsLib.getDocument(pdfUrl).promise;
                if (cancelled) return;
                pdfDocRef.current = pdf;
                const page = await pdf.getPage(pageNumber);
                if (cancelled) return;

                // Render at a fixed preview scale
                const scale = 1.5;
                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current;
                if (!canvas) return;

                const dpr = window.devicePixelRatio || 1;
                canvas.width = viewport.width * dpr;
                canvas.height = viewport.height * dpr;
                canvas.style.width = `${viewport.width}px`;
                canvas.style.height = `${viewport.height}px`;

                const ctx = canvas.getContext("2d");
                if (!ctx) return;
                ctx.scale(dpr, dpr);
                await page.render({ canvasContext: ctx, viewport }).promise;

                // Store page size in PDF points (viewport at scale 1)
                const ptViewport = page.getViewport({ scale: 1 });
                setPageSize({ width: ptViewport.width, height: ptViewport.height });

                // Default box position: top-left with a small margin
                setBoxPos({ x: 0, y: 0 });
            } catch (err) {
                console.error("Failed to render preview:", err);
            }
        };
        loadAndRender();

        return () => {
            cancelled = true;
            pdfDocRef.current = null;
        };
    }, [pdfUrl, pageNumber, pdfJsLoaded]);

    // Report position whenever the box moves
    React.useEffect(() => {
        if (!pageSize || !containerRef.current) return;
        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const canvasRect = canvas.getBoundingClientRect();

        // Scale factor: PDF points per displayed pixel
        const scaleX = pageSize.width / canvasRect.width;
        const scaleY = pageSize.height / canvasRect.height;

        // Box position relative to the canvas (in displayed pixels)
        const boxLeft = boxPos.x;
        const boxTop = boxPos.y;

        // Convert to PDF points
        const ptX = boxLeft * scaleX;
        const ptY = boxTop * scaleY;
        onPositionChange(Math.round(ptX), Math.round(ptY));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [boxPos, pageSize]);

    function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
        e.preventDefault();
        const box = boxRef.current;
        if (!box) return;
        const rect = box.getBoundingClientRect();
        dragOffsetRef.current = {
            dx: e.clientX - rect.left,
            dy: e.clientY - rect.top,
        };
        setDragging(true);
    }

    function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
        if (!dragging) return;
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;
        const containerRect = container.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();

        // New box position relative to the canvas (in displayed pixels)
        const newLeft = e.clientX - canvasRect.left - dragOffsetRef.current.dx;
        const newTop = e.clientY - canvasRect.top - dragOffsetRef.current.dy;

        // Clamp within the canvas
        const maxLeft = canvasRect.width - (boxRef.current?.offsetWidth || 0);
        const maxTop = canvasRect.height - (boxRef.current?.offsetHeight || 0);
        setBoxPos({
            x: Math.max(0, Math.min(newLeft, maxLeft)),
            y: Math.max(0, Math.min(newTop, maxTop)),
        });
    }

    function handleMouseUp() {
        setDragging(false);
    }

    if (!pdfUrl) return null;

    return (
        <div
            ref={containerRef}
            className="relative inline-block overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <canvas ref={canvasRef} className="block" />
            {pageSize && (
                <div
                    ref={boxRef}
                    onMouseDown={handleMouseDown}
                    className="absolute cursor-move border-2 border-[#f7871f] bg-[#f7871f]/20"
                    style={{
                        left: boxPos.x,
                        top: boxPos.y,
                        width: `${(boxSize.width / pageSize.width) * 100}%`,
                        height: `${(boxSize.height / pageSize.height) * 100}%`,
                    }}
                    data-testid="position-box"
                />
            )}
        </div>
    );
}
