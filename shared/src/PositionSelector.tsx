"use client";

import React from "react";

const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

interface PositionSelectorProps {
    pdfUrl: string | null;
    pageNumber: number;
    /** Default box size in PDF points (width, height). */
    boxSize?: { width: number; height: number };
    /** Optional signature image (data URL) to preview inside the box. */
    signatureImage?: string | null;
    /** Called with the top-left position in PDF points. */
    onPositionChange: (x: number, y: number) => void;
    /** Called with the box size in PDF points when resized. */
    onSizeChange?: (width: number, height: number) => void;
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
    signatureImage,
    onPositionChange,
    onSizeChange,
}: PositionSelectorProps) {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const boxRef = React.useRef<HTMLDivElement>(null);
    const [pdfJsLoaded, setPdfJsLoaded] = React.useState(false);
    const [pageSize, setPageSize] = React.useState<{ width: number; height: number } | null>(null);
    const [boxPos, setBoxPos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [boxSizePx, setBoxSizePx] = React.useState<{ width: number; height: number } | null>(null);
    const [dragging, setDragging] = React.useState(false);
    const [resizing, setResizing] = React.useState(false);
    const dragOffsetRef = React.useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
    const resizeStartRef = React.useRef<{ x: number; y: number; w: number; h: number }>({ x: 0, y: 0, w: 0, h: 0 });
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

                // Render at a scale that fits the dialog (max preview width).
                // A fixed scale of 1.5 makes an A4 page ~893px wide, which
                // overflows the dialog. Cap the preview so it stays inside.
                const MAX_PREVIEW_WIDTH = 380;
                const ptViewport = page.getViewport({ scale: 1 });
                const scale = Math.min(1.5, MAX_PREVIEW_WIDTH / ptViewport.width);
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
                setPageSize({ width: ptViewport.width, height: ptViewport.height });

                // Default box position: top-left with a small margin
                setBoxPos({ x: 0, y: 0 });

                // Compute box size in displayed pixels from PDF points
                const pxScale = viewport.width / ptViewport.width;
                setBoxSizePx({
                    width: boxSize.width * pxScale,
                    height: boxSize.height * pxScale,
                });
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

    // PDF points per displayed pixel, in each axis — shared by the position
    // and size reporting effects below, which both convert a displayed-pixel
    // quantity into PDF points via the same canvas/page ratio.
    function ptPerPx(pageSize: { width: number; height: number }, canvas: HTMLCanvasElement) {
        const canvasRect = canvas.getBoundingClientRect();
        return {
            x: pageSize.width / canvasRect.width,
            y: pageSize.height / canvasRect.height,
        };
    }

    // Report position whenever the box moves
    React.useEffect(() => {
        if (!pageSize || !canvasRef.current) return;
        const scale = ptPerPx(pageSize, canvasRef.current);
        onPositionChange(Math.round(boxPos.x * scale.x), Math.round(boxPos.y * scale.y));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [boxPos, pageSize]);

    // Report box size whenever it changes
    React.useEffect(() => {
        if (!pageSize || !boxSizePx || !canvasRef.current) return;
        const scale = ptPerPx(pageSize, canvasRef.current);
        onSizeChange?.(Math.round(boxSizePx.width * scale.x), Math.round(boxSizePx.height * scale.y));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [boxSizePx, pageSize]);

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

    function handleResizeStart(e: React.MouseEvent<HTMLDivElement>) {
        e.preventDefault();
        e.stopPropagation();
        const box = boxRef.current;
        if (!box || !boxSizePx) return;
        resizeStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            w: boxSizePx.width,
            h: boxSizePx.height,
        };
        setResizing(true);
    }

    function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;
        const containerRect = container.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();

        if (resizing) {
            const start = resizeStartRef.current;
            const dx = e.clientX - start.x;
            const dy = e.clientY - start.y;
            const newW = Math.max(40, start.w + dx);
            const newH = Math.max(20, start.h + dy);
            // Clamp within canvas
            const maxW = canvasRect.width - boxPos.x;
            const maxH = canvasRect.height - boxPos.y;
            setBoxSizePx({
                width: Math.min(newW, maxW),
                height: Math.min(newH, maxH),
            });
            return;
        }

        if (!dragging) return;
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
        setResizing(false);
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
            {pageSize && boxSizePx && (
                <div
                    ref={boxRef}
                    onMouseDown={handleMouseDown}
                    className="absolute cursor-move border-2 border-[#f7871f] bg-[#f7871f]/20 overflow-hidden"
                    style={{
                        left: boxPos.x,
                        top: boxPos.y,
                        width: boxSizePx.width,
                        height: boxSizePx.height,
                    }}
                    data-testid="position-box"
                >
                    {signatureImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={signatureImage}
                            alt=""
                            className="h-full w-full object-contain pointer-events-none"
                            draggable={false}
                        />
                    )}
                    {/* Resize handle (bottom-right corner) */}
                    <div
                        onMouseDown={handleResizeStart}
                        className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize"
                        style={{
                            background:
                                "linear-gradient(135deg, transparent 50%, #f7871f 50%)",
                        }}
                        data-testid="resize-handle"
                    />
                </div>
            )}
        </div>
    );
}
