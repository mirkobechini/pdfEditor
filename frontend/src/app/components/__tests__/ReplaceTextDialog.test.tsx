import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import ReplaceTextDialog from "../ReplaceTextDialog";

vi.mock("../../lib/api", () => ({
    api: {
        replaceText: vi.fn(),
    },
}));

const defaultProps = {
    open: true,
    onClose: vi.fn(),
    pdfId: "pdf-123",
};

describe("ReplaceTextDialog", () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it("renders when open", () => {
        render(<ReplaceTextDialog {...defaultProps} />);
        expect(screen.getByText("title")).toBeInTheDocument();
    });

    it("does not render when closed", () => {
        const { container } = render(<ReplaceTextDialog {...defaultProps} open={false} />);
        expect(container).toBeEmptyDOMElement();
    });
});