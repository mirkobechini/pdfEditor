import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import MetadataDialog from "../MetadataDialog";

vi.mock("../../lib/api", () => ({
    api: {
        getMetadata: vi.fn(),
        updateMetadata: vi.fn(),
    },
}));

import { api } from "../../lib/api";

const defaultProps = {
    open: true,
    onClose: vi.fn(),
    pdfId: "pdf-123",
    onSuccess: vi.fn(),
};

describe("MetadataDialog", () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it("renders when open", () => {
        render(<MetadataDialog {...defaultProps} />);
        expect(screen.getByText("title")).toBeInTheDocument();
    });

    it("loads metadata on open", async () => {
        (api.getMetadata as any).mockResolvedValue({
            title: "Test Title",
            author: "Test Author",
            subject: "Test Subject",
            keywords: "test, keywords",
        });

        render(<MetadataDialog {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByDisplayValue("Test Title")).toBeInTheDocument();
        });
        expect(screen.getByDisplayValue("Test Author")).toBeInTheDocument();
    });

    it("does not render when closed", () => {
        const { container } = render(<MetadataDialog {...defaultProps} open={false} />);
        expect(container).toBeEmptyDOMElement();
    });
});