import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import RemoveDialog from "../RemoveDialog";

vi.mock("../../lib/api", () => ({
    api: {
        removePages: vi.fn(),
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

describe("RemoveDialog", () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it("renders when open", () => {
        render(<RemoveDialog {...defaultProps} />);
        expect(screen.getByText("title")).toBeInTheDocument();
    });

    it("does not render when closed", () => {
        const { container } = render(<RemoveDialog {...defaultProps} open={false} />);
        expect(container).toBeEmptyDOMElement();
    });

    it("shows file info", () => {
        render(<RemoveDialog {...defaultProps} />);
        expect(screen.getByText(/test.pdf/)).toBeInTheDocument();
    });

    it("shows loading spinner while thumbnails load", () => {
        (api.downloadPdf as any).mockImplementation(() => new Promise(() => { }));
        render(<RemoveDialog {...defaultProps} />);
        expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });

    it("shows error message when thumbnails fail to load", async () => {
        (api.downloadPdf as any).mockRejectedValue(new Error("Load failed"));
        render(<RemoveDialog {...defaultProps} />);
        expect(await screen.findByText(/failed/)).toBeInTheDocument();
    });

    it("calls onClose when overlay clicked", () => {
        const onClose = vi.fn();
        render(<RemoveDialog {...defaultProps} onClose={onClose} />);
        fireEvent.click(screen.getByText("title").closest(".fixed")!);
        expect(onClose).toHaveBeenCalled();
    });
});