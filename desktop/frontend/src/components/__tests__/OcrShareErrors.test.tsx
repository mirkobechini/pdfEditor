import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import OcrModal from "../OcrModal";
import ShareDialog from "../ShareDialog";

// Traduttore finto: risolve solo le chiavi note, il resto resta grezzo.
const messages: Record<string, string> = {
    failed: "OCR fallito",
    loadFailed: "Caricamento fallito",
    "common.validationError": "Dati di input non validi",
};
vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => messages[key] ?? key,
}));

const mockOcrPdf = vi.fn();
const mockListShareLinks = vi.fn();
vi.mock("../../shared/api", () => ({
    api: {
        ocrPdf: (...args: any[]) => mockOcrPdf(...args),
        listShareLinks: (...args: any[]) => mockListShareLinks(...args),
    },
    cloudApi: {},
}));
vi.mock("../../shared/tauri", () => ({ isTauri: () => false }));

const validationError = () =>
    new Error(JSON.stringify({ code: "VALIDATION_ERROR", detail: "bad" }));

describe("OCR/Share translated errors", () => {
    beforeEach(() => vi.clearAllMocks());

    it("OcrModal shows a translated error, never the raw key", async () => {
        mockOcrPdf.mockRejectedValue(validationError());
        render(<OcrModal open onClose={() => { }} pdfId="p1" />);
        fireEvent.click(screen.getByTestId("ocr-run"));
        await waitFor(() =>
            expect(screen.getByTestId("ocr-error").textContent).toBe("OCR fallito: Dati di input non validi"),
        );
        expect(screen.queryByText(/common\.validationError/)).toBeNull();
    });

    it("ShareDialog shows a translated load error, never the raw key", async () => {
        mockListShareLinks.mockRejectedValue(validationError());
        render(<ShareDialog open onClose={() => { }} pdfId="p1" />);
        await waitFor(() =>
            expect(screen.getByText("Caricamento fallito: Dati di input non validi")).toBeInTheDocument(),
        );
    });
});
