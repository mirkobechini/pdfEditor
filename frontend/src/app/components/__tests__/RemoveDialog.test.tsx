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
});