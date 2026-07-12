import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import PdfThumbnail from "../PdfThumbnail";

vi.mock("../../lib/api", () => ({
    api: {
        downloadPdf: vi.fn().mockResolvedValue(new Blob(["test"], { type: "application/pdf" })),
        getPdf: vi.fn(),
    },
}));

vi.mock("../../lib/pdfPreview", () => ({
    renderFirstPageToDataUrl: vi.fn(),
}));

import { renderFirstPageToDataUrl } from "../../lib/pdfPreview";

const defaultProps = {
    file: { id: "1", original_filename: "test.pdf", file_size: 100, page_count: 3, created_at: "", updated_at: "" },
};

describe("PdfThumbnail", () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it("renders fallback on error", async () => {
        (renderFirstPageToDataUrl as any).mockRejectedValue(new Error("Failed"));
        render(<PdfThumbnail {...defaultProps} />);
        const fallback = await screen.findByText("Preview unavailable");
        expect(fallback).toBeInTheDocument();
    });
});
