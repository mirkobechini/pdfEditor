import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import ReorderDialog from "../ReorderDialog";

vi.mock("../../lib/api", () => ({
    api: {
        downloadPdf: vi.fn(),
        reorderPages: vi.fn(),
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
    totalPages: 3,
    onSuccess: vi.fn(),
};

beforeEach(() => { vi.clearAllMocks(); });

describe("ReorderDialog", () => {
    it("renders when open", () => {
        render(<ReorderDialog {...defaultProps} />);
        expect(screen.getByText("title")).toBeInTheDocument();
    });

    it("does not render when closed", () => {
        const { container } = render(<ReorderDialog {...defaultProps} open={false} />);
        expect(container).toBeEmptyDOMElement();
    });

    it("shows file info", () => {
        render(<ReorderDialog {...defaultProps} />);
        expect(screen.getByText(/test.pdf/)).toBeInTheDocument();
        expect(screen.getByText(/3/)).toBeInTheDocument();
    });

    it("shows loading spinner while thumbnails load", () => {
        (api.downloadPdf as any).mockImplementation(() => new Promise(() => { }));
        render(<ReorderDialog {...defaultProps} />);
        expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });

    it("shows error message when thumbnails fail to load", async () => {
        (api.downloadPdf as any).mockRejectedValue(new Error("Load failed"));
        render(<ReorderDialog {...defaultProps} />);
        expect(await screen.findByText(/failed/)).toBeInTheDocument();
    });

    it("calls onClose when overlay clicked", () => {
        const onClose = vi.fn();
        render(<ReorderDialog {...defaultProps} onClose={onClose} />);
        fireEvent.click(screen.getByText("title").closest(".fixed")!);
        expect(onClose).toHaveBeenCalled();
    });
});