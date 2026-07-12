import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import DeleteModal from "../DeleteModal";

vi.mock("../../lib/api", () => ({
    api: { deletePdf: vi.fn(), downloadPdf: vi.fn() },
}));

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}));

const defaultProps = {
    open: true,
    onClose: vi.fn(),
    file: { id: "1", original_filename: "test.pdf", file_size: 1000, page_count: 5, created_at: "", updated_at: "" },
    onConfirm: vi.fn(),
};

describe("DeleteModal", () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it("renders when open", () => {
        render(<DeleteModal {...defaultProps} />);
        expect(screen.getByText("title")).toBeInTheDocument();
    });

    it("does not render when closed", () => {
        const { container } = render(<DeleteModal {...defaultProps} open={false} />);
        expect(container).toBeEmptyDOMElement();
    });

    it("shows warning text", () => {
        render(<DeleteModal {...defaultProps} />);
        expect(screen.getByText("warning")).toBeInTheDocument();
    });
});
