"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { api } from "../shared/api";
import type { PdfDocument } from "../shared/types";
import { useApiError } from "../hooks/useApiError";

interface SignModalProps {
    open: boolean;
    pdfId: string;
    pdfName: string;
    totalPages: number;
    onClose: () => void;
    onSaved: (updatedDoc: PdfDocument) => void;
}

export default function SignModal({ open, pdfId, pdfName, totalPages, onClose, onSaved }: SignModalProps) {
    const t = useTranslations("signModal");
    const { apiError } = useApiError();
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const [drawing, setDrawing] = React.useState(false);
    const [hasSignature, setHasSignature] = React.useState(false);
    const [pageNumber, setPageNumber] = React.useState(1);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (open) {
            setPageNumber(1);
            setError(null);
            setHasSignature(false);
            clearCanvas();
        }
    }, [open]);

    function clearCanvas() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
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
    }

    function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        (reader as any).readAsDataURL(file).then((dataUrl: string) => {
            const img = document.createElement("img");
            img.onload = () => {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const ctx = canvas.getContext("2d");
                if (!ctx) return;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                setHasSignature(true);
            };
            img.src = dataUrl;
        });
    }

    function getSignatureBase64(): string | null {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const dataUrl = canvas.toDataURL("image/png");
        const base64 = dataUrl.split(",")[1];
        return base64 || null;
    }

    async function handleSign() {
        if (!hasSignature) {
            setError(t("noSignature"));
            return;
        }
        const signatureB64 = getSignatureBase64();
        if (!signatureB64) {
            setError(t("noSignature"));
            return;
        }

        setSaving(true); setError(null);
        try {
            const doc = await api.signPdf(pdfId, signatureB64, pageNumber, 50, 50, 200, 80);
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
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">{t("title")}</h2>

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
                        <label className="text-sm text-gray-500 dark:text-gray-400">{t("uploadLabel")}</label>
                        <input
                            type="file"
                            accept="image/png,image/jpeg"
                            onChange={handleUpload}
                            className="text-sm"
                        />
                    </div>

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
                            onClick={handleSign}
                            disabled={saving}
                            className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-500 disabled:opacity-50"
                        >
                            {saving ? t("signing") : t("sign")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}