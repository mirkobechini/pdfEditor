import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import ProtectDialog from "../ProtectDialog";

vi.mock("../../lib/api", () => ({
    api: {
        protectPdf: vi.fn(),
    },
}));

const defaultProps = {
    open: true,
    onClose: vi.fn(),
    pdfId: "pdf-123",
};

describe("ProtectDialog", () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it("renders when open", () => {
        render(<ProtectDialog {...defaultProps} />);
        expect(screen.getByText("title")).toBeInTheDocument();
    });

    it("does not render when closed", () => {
        const { container } = render(<ProtectDialog {...defaultProps} open={false} />);
        expect(container).toBeEmptyDOMElement();
    });
});