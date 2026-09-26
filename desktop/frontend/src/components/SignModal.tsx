"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { api } from "../shared/api";
import type { PdfDocument } from "../shared/types";
import { useApiError } from "../hooks/useApiError";
import PositionSelector from "./PositionSelector";

interface SignModalProps {
    open: boolean;
    pdfId: string;
    pdfName: string;
    totalPages: number;
    pdfUrl?: string | null;
    onClose: () => void;
    onSaved: (updatedDoc: PdfDocument) => void;
}

export default function SignModal({ open, pdfId, pdfName, totalPages, pdfUrl, onClose, onSaved }: SignModalProps) {
    const t = useTranslations("signModal");
    const { apiError } = useApiError();
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const [drawing, setDrawing] = React.useState(false);
    const [hasSignature, setHasSignature] = React.useState(false);
    const [signatureImage, setSignatureImage] = React.useState<string | null>(null);
    // Persisted signature as data URL — survives canvas unmount (step position)
    const [signatureDataUrl, setSignatureDataUrl] = React.useState<string | null>(null);
    const [pageNumber, setPageNumber] = React.useState(1);
    const [signX, setSignX] = React.useState(50);
    const [signY, setSignY] = React.useState(50);
    const [signWidth, setSignWidth] = React.useState(200);
    const [signHeight, setSignHeight] = React.useState(80);
    const [step, setStep] = React.useState<"choose" | "position">("choose");
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    // Undo/redo stacks (canvas snapshots as data URLs)
    const undoStackRef = React.useRef<string[]>([]);
    const redoStackRef = React.useRef<string[]>([]);
    // Bump to force re-render of undo/redo buttons when stacks change
    const [historyVersion, setHistoryVersion] = React.useState(0);

    React.useEffect(() => {
        if (open) {
            setPageNumber(1);
            setError(null);
            setHasSignature(false);
            setSignatureImage(null);
            setSignatureDataUrl(null);
            setStep("choose");
            setSignWidth(200);
            setSignHeight(80);
            undoStackRef.current = [];
            redoStackRef.current = [];
            setHistoryVersion((v) => v + 1);
            clearCanvas();
        }
    }, [open]);

    function snapshotCanvas() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        undoStackRef.current.push(canvas.toDataURL("image/png"));
        // Cap the undo stack to avoid unbounded memory
        if (undoStackRef.current.length > 50) undoStackRef.current.shift();
        redoStackRef.current = [];
        setHistoryVersion((v) => v + 1);
    }

    function clearCanvas() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
        setSignatureImage(null);
        setSignatureDataUrl(null);
        undoStackRef.current = [];
        redoStackRef.current = [];
        setHistoryVersion((v) => v + 1);
    }

    function undo() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const prev = undoStackRef.current.pop();
        if (!prev) return;
        // Push current state to redo stack
        redoStackRef.current.push(canvas.toDataURL("image/png"));
        setHistoryVersion((v) => v + 1);
        const img = document.createElement("img");
        img.onload = () => {
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            setHasSignature(true);
            // Persist the restored state so the final signature reflects it
            setSignatureDataUrl(canvas.toDataURL("image/png"));
        };
        img.src = prev;
    }

    function redo() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const next = redoStackRef.current.pop();
        if (!next) return;
        undoStackRef.current.push(canvas.toDataURL("image/png"));
        setHistoryVersion((v) => v + 1);
        const img = document.createElement("img");
        img.onload = () => {
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            setHasSignature(true);
            // Persist the restored state so the final signature reflects it
            setSignatureDataUrl(canvas.toDataURL("image/png"));
        };
        img.src = next;
    }

    function getCanvasPoint(e: React.MouseEvent<HTMLCanvasElement>) {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    }

    function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        snapshotCanvas();
        const { x, y } = getCanvasPoint(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        setDrawing(true);
        setHasSignature(true);
    }

    function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
        if (!drawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const { x, y } = getCanvasPoint(e);
        ctx.lineTo(x, y);
        ctx.stroke();
    }

    function handleMouseUp() {
        setDrawing(false);
        // Persist the drawn signature so it survives canvas unmount
        const canvas = canvasRef.current;
        if (canvas) {
            setSignatureDataUrl(canvas.toDataURL("image/png"));
        }
    }

    function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            const img = document.createElement("img");
            img.onload = () => {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const ctx = canvas.getContext("2d");
                if (!ctx) return;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                // Draw the image preserving its aspect ratio (contain), centered
                // in the canvas — NOT stretched to fill it (which distorted the
                // signature).
                const scale = Math.min(
                    canvas.width / img.naturalWidth,
                    canvas.height / img.naturalHeight,
                );
                const drawW = img.naturalWidth * scale;
                const drawH = img.naturalHeight * scale;
                const offsetX = (canvas.width - drawW) / 2;
                const offsetY = (canvas.height - drawH) / 2;
                ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
                setHasSignature(true);
                setSignatureImage(dataUrl);
                setSignatureDataUrl(dataUrl);
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    }

    function getSignatureBase64(): string | null {
        // Prefer the persisted data URL (works even when the canvas is unmounted)
        if (signatureDataUrl) {
            const base64 = signatureDataUrl.split(",")[1];
            if (base64) return base64;
        }
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const dataUrl = canvas.toDataURL("image/png");
        const base64 = dataUrl.split(",")[1];
        return base64 || null;
    }

    async function handleSign() {
        const signatureB64 = getSignatureBase64();
        if (!signatureB64) {
            setError(t("noSignature"));
            return;
        }

        setSaving(true); setError(null);
        try {
            const doc = await api.signPdf(pdfId, signatureB64, pageNumber, signX, signY, signWidth, signHeight);
            onSaved(doc);
            onClose();
        } catch (err) {
            setError(t("signFailed") + ": " + apiError(err));
        } finally {
            setSaving(false);
        }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto"
                data-history={historyVersion}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">{t("title")}</h2>

                {/* Step indicator */}
                <div className="mb-4 flex items-center gap-2 text-xs font-medium">
                    <span className={`rounded-full px-2.5 py-1 ${step === "choose" ? "bg-orange-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                        {t("stepChoose")}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className={`rounded-full px-2.5 py-1 ${step === "position" ? "bg-orange-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                        {t("stepPosition")}
                    </span>
                </div>

                {step === "choose" ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t("drawLabel")}</label>
                            <canvas
                                ref={canvasRef}
                                width={400}
                                height={160}
                                className="w-full h-40 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 touch-none"
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={clearCanvas}
                                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                {t("clear")}
                            </button>
                            <button
                                type="button"
                                onClick={undo}
                                disabled={undoStackRef.current.length === 0}
                                data-testid="signature-undo"
                                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
                            >
                                {t("undo")}
                            </button>
                            <button
                                type="button"
                                onClick={redo}
                                disabled={redoStackRef.current.length === 0}
                                data-testid="signature-redo"
                                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
                            >
                                {t("redo")}
                            </button>
                            <label
                                htmlFor="signature-image-upload"
                                className="cursor-pointer px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                data-testid="signature-upload-button"
                            >
                                {t("uploadLabel")}
                            </label>
                            <input
                                id="signature-image-upload"
                                type="file"
                                accept="image/png,image/jpeg"
                                onChange={handleUpload}
                                className="hidden"
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        )}

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                {t("cancel")}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!hasSignature) {
                                        setError(t("noSignature"));
                                        return;
                                    }
                                    setError(null);
                                    setStep("position");
                                }}
                                disabled={!hasSignature}
                                data-testid="signature-next"
                                className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-500 disabled:opacity-50"
                            >
                                {t("next")}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t("pageLabel")}</label>
                            <input
                                type="number"
                                min={1}
                                max={Math.max(totalPages, 1)}
                                value={pageNumber}
                                onChange={(e) => setPageNumber(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t("positionLabel")}</label>
                            <PositionSelector
                                pdfUrl={pdfUrl ?? null}
                                pageNumber={pageNumber}
                                boxSize={{ width: signWidth, height: signHeight }}
                                signatureImage={signatureImage}
                                onPositionChange={(x, y) => { setSignX(x); setSignY(y); }}
                                onSizeChange={(w, h) => { setSignWidth(w); setSignHeight(h); }}
                            />
                            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{t("resizeHint")}</p>
                        </div>

                        {error && (
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        )}

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setStep("choose")}
                                data-testid="signature-back"
                                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                {t("back")}
                            </button>
                            <button
                                type="button"
                                onClick={handleSign}
                                disabled={saving}
                                data-testid="signature-sign"
                                className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-500 disabled:opacity-50"
                            >
                                {saving ? t("signing") : t("sign")}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}