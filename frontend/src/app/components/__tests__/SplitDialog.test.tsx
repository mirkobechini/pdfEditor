import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import SplitDialog from "../SplitDialog";

vi.mock("../../lib/api", () => ({
    api: {
        listPdfs: vi.fn(),
        splitPdf: vi.fn(),
        downloadPdf: vi.fn(),
    },
}));

vi.mock("../../lib/usePdfJs", () => ({
    usePdfJs: () => true,
}));

import { api } from "../../lib/api";

const defaultProps = {
    open: true,
    onClose: vi.fn(),
    selectedId: "pdf-123",
    selectedName: "test.pdf",
    totalPages: 5,
    onSuccess: vi.fn(),
};

describe("SplitDialog", () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it("renders when open", () => {
        render(<SplitDialog {...defaultProps} />);
        expect(screen.getByText("title")).toBeInTheDocument();
    });

    it("does not render when closed", () => {
        const { container } = render(<SplitDialog {...defaultProps} open={false} />);
        expect(container).toBeEmptyDOMElement();
    });

    it("shows file info", () => {
        render(<SplitDialog {...defaultProps} />);
        expect(screen.getByText(/test.pdf/)).toBeInTheDocument();
        expect(screen.getByText(/5/)).toBeInTheDocument();
    });

    it("shows loading spinner while thumbnails load", () => {
        (api.downloadPdf as any).mockImplementation(() => new Promise(() => { }));
        render(<SplitDialog {...defaultProps} />);
        expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });

    it("shows error message when thumbnails fail to load", async () => {
        (api.downloadPdf as any).mockRejectedValue(new Error("Load failed"));
        render(<SplitDialog {...defaultProps} />);
        expect(await screen.findByText(/failed/)).toBeInTheDocument();
    });

    it("calls onClose when overlay clicked", () => {
        const onClose = vi.fn();
        render(<SplitDialog {...defaultProps} onClose={onClose} />);
        fireEvent.click(screen.getByText("title").closest(".fixed")!);
        expect(onClose).toHaveBeenCalled();
    });
});