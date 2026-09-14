import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import CompressDialog from "../CompressDialog";

vi.mock("../../lib/api", () => ({
    api: {
        compressPdf: vi.fn(),
    },
}));

vi.mock("../../lib/error-map", () => ({
    mapError: (err: unknown) => (err instanceof Error ? err.message : String(err)),
}));

import { api } from "../../lib/api";

const defaultProps = {
    open: true,
    onClose: vi.fn(),
    selectedId: "pdf-123",
    selectedName: "test.pdf",
    onSuccess: vi.fn(),
};

describe("CompressDialog", () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it("renders when open", () => {
        render(<CompressDialog {...defaultProps} />);
        expect(screen.getByText("title")).toBeInTheDocument();
    });

    it("does not render when closed", () => {
        const { container } = render(<CompressDialog {...defaultProps} open={false} />);
        expect(container).toBeEmptyDOMElement();
    });

    it("defaults output name to compressed_<name>", () => {
        render(<CompressDialog {...defaultProps} />);
        const input = screen.getByDisplayValue("compressed_test.pdf");
        expect(input).toBeInTheDocument();
    });

    it("calls compressPdf with default quality and no overwrite", async () => {
        (api.compressPdf as any).mockResolvedValue({ id: "compressed-1" });
        const onSuccess = vi.fn();
        const onClose = vi.fn();
        render(<CompressDialog {...defaultProps} onSuccess={onSuccess} onClose={onClose} />);

        fireEvent.click(screen.getByText("confirm"));
        await waitFor(() => {
            expect(api.compressPdf).toHaveBeenCalledWith("pdf-123", "medium", "compressed_test.pdf", false);
        });
        expect(onSuccess).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
    });

    it("calls compressPdf with selected quality and overwrite", async () => {
        (api.compressPdf as any).mockResolvedValue({ id: "compressed-1" });
        render(<CompressDialog {...defaultProps} />);

        // Select high quality
        fireEvent.change(screen.getByRole("combobox"), { target: { value: "high" } });
        // Check overwrite
        fireEvent.click(screen.getByRole("checkbox"));
        // Change output name
        fireEvent.change(screen.getByDisplayValue("compressed_test.pdf"), { target: { value: "my.pdf" } });

        fireEvent.click(screen.getByText("confirm"));
        await waitFor(() => {
            expect(api.compressPdf).toHaveBeenCalledWith("pdf-123", "high", "my.pdf", true);
        });
    });

    it("shows error when compressPdf fails", async () => {
        (api.compressPdf as any).mockRejectedValue(new Error("Compression failed"));
        render(<CompressDialog {...defaultProps} />);

        fireEvent.click(screen.getByText("confirm"));
        await waitFor(() => {
            expect(screen.getByText(/Compression failed/)).toBeInTheDocument();
        });
    });
});