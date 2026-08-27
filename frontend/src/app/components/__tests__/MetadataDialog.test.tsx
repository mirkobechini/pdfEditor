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

vi.mock("../../lib/error-map", () => ({
    mapError: (err: unknown) => (err instanceof Error ? err.message : String(err)),
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

    it("shows error when metadata load fails", async () => {
        (api.getMetadata as any).mockRejectedValue(new Error("Load failed"));
        render(<MetadataDialog {...defaultProps} />);
        expect(await screen.findByText(/Load failed/)).toBeInTheDocument();
    });

    it("edits title and saves", async () => {
        (api.getMetadata as any).mockResolvedValue({
            title: "Old Title",
            author: "",
            subject: "",
            keywords: "",
        });
        (api.updateMetadata as any).mockResolvedValue({
            id: "pdf-123",
            title: "New Title",
        });

        const onSuccess = vi.fn();
        const onClose = vi.fn();
        render(<MetadataDialog {...defaultProps} onSuccess={onSuccess} onClose={onClose} />);

        await waitFor(() => {
            expect(screen.getByDisplayValue("Old Title")).toBeInTheDocument();
        });

        const titleInput = screen.getByDisplayValue("Old Title");
        fireEvent.change(titleInput, { target: { value: "New Title" } });
        fireEvent.click(screen.getByText("save"));

        await waitFor(() => {
            expect(api.updateMetadata).toHaveBeenCalledWith(
                "pdf-123",
                expect.objectContaining({ title: "New Title" }),
            );
        });
        expect(onSuccess).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
    });

    it("shows error when save fails", async () => {
        (api.getMetadata as any).mockResolvedValue({
            title: "",
            author: "",
            subject: "",
            keywords: "",
        });
        (api.updateMetadata as any).mockRejectedValue(new Error("Save failed"));

        render(<MetadataDialog {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText("titlePlaceholder")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText("save"));
        expect(await screen.findByText(/Save failed/)).toBeInTheDocument();
    });

    it("shows saving state while saving", async () => {
        (api.getMetadata as any).mockResolvedValue({
            title: "",
            author: "",
            subject: "",
            keywords: "",
        });
        (api.updateMetadata as any).mockImplementation(
            () => new Promise(() => { }),
        );

        render(<MetadataDialog {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText("titlePlaceholder")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText("save"));
        expect(screen.getByText("saving")).toBeInTheDocument();
    });

    it("calls onClose when cancel clicked", async () => {
        (api.getMetadata as any).mockResolvedValue({
            title: "",
            author: "",
            subject: "",
            keywords: "",
        });
        const onClose = vi.fn();
        render(<MetadataDialog {...defaultProps} onClose={onClose} />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText("titlePlaceholder")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText("cancel"));
        expect(onClose).toHaveBeenCalled();
    });

    it("calls onClose when overlay clicked", () => {
        const onClose = vi.fn();
        (api.getMetadata as any).mockResolvedValue({
            title: "",
            author: "",
            subject: "",
            keywords: "",
        });
        render(<MetadataDialog {...defaultProps} onClose={onClose} />);
        fireEvent.click(screen.getByText("title").closest(".fixed")!);
        expect(onClose).toHaveBeenCalled();
    });
});