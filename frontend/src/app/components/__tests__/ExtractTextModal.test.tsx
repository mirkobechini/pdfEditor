import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import ExtractTextModal from "../ExtractTextModal";

// Mock next-intl
vi.mock("next-intl", () => {
    const t = (key: string) => key;
    return { useTranslations: () => t };
});

// Mock api
const mockExtractText = vi.fn();
vi.mock("../../lib/api", () => ({
    api: {
        extractText: (...args: any[]) => mockExtractText(...args),
    },
}));

describe("ExtractTextModal", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockExtractText.mockResolvedValue({ text: "ciao mondo", pages: 3 });
        Object.assign(navigator, {
            clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
        });
    });

    it("returns null when closed", () => {
        render(<ExtractTextModal open={false} onClose={() => { }} pdfId="p1" />);
        expect(screen.queryByText("title")).not.toBeInTheDocument();
    });

    it("renders the form when open", () => {
        render(<ExtractTextModal open={true} onClose={() => { }} pdfId="p1" />);
        expect(screen.getByTestId("extract-text-page")).toBeInTheDocument();
        expect(screen.getByTestId("extract-text-run")).toBeInTheDocument();
    });

    it("extracts text from all pages by default", async () => {
        render(<ExtractTextModal open={true} onClose={() => { }} pdfId="p1" />);

        fireEvent.click(screen.getByTestId("extract-text-run"));

        await waitFor(() => {
            expect(mockExtractText).toHaveBeenCalledWith("p1", undefined);
        });
        const result = await screen.findByTestId("extract-text-result");
        expect(result).toHaveValue("ciao mondo");
    });

    it("extracts text from a specific page when filled in", async () => {
        render(<ExtractTextModal open={true} onClose={() => { }} pdfId="p1" />);
        fireEvent.change(screen.getByTestId("extract-text-page"), { target: { value: "2" } });
        fireEvent.click(screen.getByTestId("extract-text-run"));

        await waitFor(() => {
            expect(mockExtractText).toHaveBeenCalledWith("p1", 2);
        });
    });

    it("shows an empty-state message when no text is found", async () => {
        mockExtractText.mockResolvedValue({ text: "   ", pages: 1 });
        render(<ExtractTextModal open={true} onClose={() => { }} pdfId="p1" />);

        fireEvent.click(screen.getByTestId("extract-text-run"));

        expect(await screen.findByTestId("extract-text-empty")).toBeInTheDocument();
    });

    it("shows processing state while extraction runs", async () => {
        mockExtractText.mockImplementation(() => new Promise(() => { }));
        render(<ExtractTextModal open={true} onClose={() => { }} pdfId="p1" />);

        fireEvent.click(screen.getByTestId("extract-text-run"));

        expect(await screen.findByTestId("extract-text-processing")).toBeInTheDocument();
    });

    it("shows error when extraction fails", async () => {
        mockExtractText.mockRejectedValue(new Error("network"));
        render(<ExtractTextModal open={true} onClose={() => { }} pdfId="p1" />);

        fireEvent.click(screen.getByTestId("extract-text-run"));

        expect(await screen.findByTestId("extract-text-error")).toBeInTheDocument();
    });

    it("copies the extracted text to the clipboard", async () => {
        render(<ExtractTextModal open={true} onClose={() => { }} pdfId="p1" />);

        fireEvent.click(screen.getByTestId("extract-text-run"));
        await screen.findByTestId("extract-text-result");
        fireEvent.click(screen.getByTestId("extract-text-copy"));

        await waitFor(() => {
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith("ciao mondo");
        });
    });

    it("resets state when reopened", async () => {
        const { rerender } = render(<ExtractTextModal open={true} onClose={() => { }} pdfId="p1" />);
        fireEvent.click(screen.getByTestId("extract-text-run"));
        await screen.findByTestId("extract-text-result");

        rerender(<ExtractTextModal open={false} onClose={() => { }} pdfId="p1" />);
        rerender(<ExtractTextModal open={true} onClose={() => { }} pdfId="p1" />);

        expect(screen.queryByTestId("extract-text-result")).not.toBeInTheDocument();
    });
});
