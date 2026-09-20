import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import OcrModal from "../OcrModal";

const mockOnClose = vi.fn();
const mockOnSuccess = vi.fn();
const mockOcrPdf = vi.fn();

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));

vi.mock("../../shared/api", () => ({
    api: {
        ocrPdf: (...args: any[]) => mockOcrPdf(...args),
    },
}));

const baseProps = {
    open: true,
    pdfId: "p1",
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
};

describe("OcrModal", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders title and language selector", () => {
        render(<OcrModal {...baseProps} />);
        expect(screen.getByText("title")).toBeInTheDocument();
        expect(screen.getByTestId("ocr-language")).toBeInTheDocument();
    });

    it("runs OCR and calls onSuccess + onClose", async () => {
        mockOcrPdf.mockResolvedValue({ id: "p1" });
        render(<OcrModal {...baseProps} />);
        fireEvent.click(screen.getByTestId("ocr-run"));
        await waitFor(() => expect(mockOcrPdf).toHaveBeenCalledWith("p1", "eng"));
        expect(mockOnSuccess).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
    });

    it("shows error on failure", async () => {
        mockOcrPdf.mockRejectedValue(new Error("fail"));
        render(<OcrModal {...baseProps} />);
        fireEvent.click(screen.getByTestId("ocr-run"));
        await waitFor(() => expect(screen.getByTestId("ocr-error")).toBeInTheDocument());
    });

    it("returns null when closed", () => {
        render(<OcrModal {...baseProps} open={false} />);
        expect(screen.queryByTestId("ocr-language")).not.toBeInTheDocument();
    });
});