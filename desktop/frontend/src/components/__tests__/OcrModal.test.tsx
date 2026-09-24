import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import OcrModal from "../OcrModal";

// Mock next-intl
vi.mock("next-intl", () => {
    const t = (key: string) => key;
    return { useTranslations: () => t };
});

// Mock api
const mockOcrPdf = vi.fn();
vi.mock("../../shared/api", () => ({
    api: {
        ocrPdf: (...args: any[]) => mockOcrPdf(...args),
    },
}));

describe("OcrModal", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockOcrPdf.mockResolvedValue({ id: "p1" });
    });

    it("returns null when closed", () => {
        render(<OcrModal open={false} onClose={() => { }} pdfId="p1" />);
        expect(screen.queryByText("title")).not.toBeInTheDocument();
    });

    it("renders OCR form when open", () => {
        render(<OcrModal open={true} onClose={() => { }} pdfId="p1" />);
        expect(screen.getByTestId("ocr-language")).toBeInTheDocument();
        expect(screen.getByTestId("ocr-run")).toBeInTheDocument();
    });

    it("runs OCR with default language", async () => {
        const onClose = vi.fn();
        const onSuccess = vi.fn();
        render(<OcrModal open={true} onClose={onClose} pdfId="p1" onSuccess={onSuccess} />);

        fireEvent.click(screen.getByTestId("ocr-run"));

        await waitFor(() => {
            expect(mockOcrPdf).toHaveBeenCalledWith("p1", "eng");
        });
        expect(onSuccess).toHaveBeenCalled();
        // Dialog stays open to show the success feedback
        expect(onClose).not.toHaveBeenCalled();
    });

    it("shows success feedback after OCR completes", async () => {
        render(<OcrModal open={true} onClose={() => { }} pdfId="p1" />);

        fireEvent.click(screen.getByTestId("ocr-run"));

        expect(await screen.findByTestId("ocr-success")).toBeInTheDocument();
    });

    it("shows processing state while OCR runs", async () => {
        // Never resolve so the running state persists
        mockOcrPdf.mockImplementation(() => new Promise(() => { }));
        render(<OcrModal open={true} onClose={() => { }} pdfId="p1" />);

        fireEvent.click(screen.getByTestId("ocr-run"));

        expect(await screen.findByTestId("ocr-processing")).toBeInTheDocument();
    });

    it("runs OCR with selected language", async () => {
        render(<OcrModal open={true} onClose={() => { }} pdfId="p1" />);
        fireEvent.change(screen.getByTestId("ocr-language"), { target: { value: "ita" } });
        fireEvent.click(screen.getByTestId("ocr-run"));

        await waitFor(() => {
            expect(mockOcrPdf).toHaveBeenCalledWith("p1", "ita");
        });
    });

    it("shows error when OCR fails", async () => {
        mockOcrPdf.mockRejectedValue(new Error("network"));
        render(<OcrModal open={true} onClose={() => { }} pdfId="p1" />);

        fireEvent.click(screen.getByTestId("ocr-run"));

        expect(await screen.findByTestId("ocr-error")).toBeInTheDocument();
    });
});
