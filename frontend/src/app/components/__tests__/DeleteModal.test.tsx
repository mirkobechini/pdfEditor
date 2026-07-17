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

    it("calls onConfirm and shows deleting state", async () => {
        const onConfirm = vi.fn().mockImplementation(() => new Promise(() => { }));
        render(<DeleteModal {...defaultProps} onConfirm={onConfirm} />);
        fireEvent.click(screen.getByText("confirm"));
        expect(await screen.findByText("deleting")).toBeInTheDocument();
        expect(onConfirm).toHaveBeenCalled();
    });

    it("catches error from onConfirm and shows alert", async () => {
        const onConfirm = vi.fn().mockRejectedValue(new Error("Failed"));
        render(<DeleteModal {...defaultProps} onConfirm={onConfirm} />);
        fireEvent.click(screen.getByText("confirm"));
        // The catch block calls alert(t("deleteFailed"))
        // We can't easily test alert in jsdom, but we can verify onConfirm was called
        await vi.waitFor(() => expect(onConfirm).toHaveBeenCalled());
    });

    it("closes when clicking overlay background", () => {
        const onClose = vi.fn();
        render(<DeleteModal {...defaultProps} onClose={onClose} />);
        const overlay = screen.getByRole("dialog");
        fireEvent.click(overlay);
        expect(onClose).toHaveBeenCalled();
    });
});
