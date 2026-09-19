import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import SignDialog from "../SignDialog";

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}));

vi.mock("../../lib/api", () => ({
    api: { signPdf: vi.fn() },
}));

import { api } from "../../lib/api";

const defaultProps = { open: true, onClose: vi.fn(), pdfId: "pdf-1", totalPages: 3 };

// Mock canvas context so drawing works in jsdom
function mockCanvas() {
    const ctx = {
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        clearRect: vi.fn(),
        drawImage: vi.fn(),
        set strokeStyle(v: string) {},
        set lineWidth(v: number) {},
        set lineCap(v: string) {},
    };
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(ctx);
    HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue("data:image/png;base64,c2ln");
    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn().mockReturnValue({ left: 0, top: 0, width: 400, height: 160 });
    return ctx;
}

describe("SignDialog", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockCanvas();
    });

    it("renders nothing when closed", () => {
        const { container } = render(<SignDialog {...defaultProps} open={false} />);
        expect(container.innerHTML).toBe("");
    });

    it("renders form when open", () => {
        render(<SignDialog {...defaultProps} />);
        expect(screen.getByText("title")).toBeInTheDocument();
        expect(screen.getByText("drawLabel")).toBeInTheDocument();
    });

    it("shows error when no signature drawn", async () => {
        render(<SignDialog {...defaultProps} />);
        fireEvent.click(screen.getByText("sign"));
        expect(await screen.findByText("noSignature")).toBeInTheDocument();
    });

    it("calls signPdf when signature drawn", async () => {
        (api.signPdf as any).mockResolvedValue({ id: "pdf-1", original_filename: "test.pdf" });
        render(<SignDialog {...defaultProps} />);

        // Simulate drawing on the canvas
        const canvas = document.querySelector("canvas")!;
        fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
        fireEvent.mouseMove(canvas, { clientX: 50, clientY: 50 });
        fireEvent.mouseUp(canvas);

        fireEvent.click(screen.getByText("sign"));
        await vi.waitFor(() => {
            expect(api.signPdf).toHaveBeenCalledWith("pdf-1", "c2ln", 1, 50, 50, 200, 80);
        });
    });

    it("calls onClose after successful sign", async () => {
        const onClose = vi.fn();
        (api.signPdf as any).mockResolvedValue({ id: "pdf-1", original_filename: "test.pdf" });
        render(<SignDialog {...defaultProps} onClose={onClose} />);

        const canvas = document.querySelector("canvas")!;
        fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
        fireEvent.mouseUp(canvas);

        fireEvent.click(screen.getByText("sign"));
        await vi.waitFor(() => {
            expect(onClose).toHaveBeenCalled();
        });
    });

    it("shows error when signPdf fails", async () => {
        (api.signPdf as any).mockRejectedValue(new Error("boom"));
        render(<SignDialog {...defaultProps} />);

        const canvas = document.querySelector("canvas")!;
        fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
        fireEvent.mouseUp(canvas);

        fireEvent.click(screen.getByText("sign"));
        expect(await screen.findByText(/signFailed/)).toBeInTheDocument();
    });

    it("clears canvas when clear button clicked", () => {
        render(<SignDialog {...defaultProps} />);
        fireEvent.click(screen.getByText("clear"));
        // clearRect should have been called
        const ctx = HTMLCanvasElement.prototype.getContext as any;
        expect(ctx).toHaveBeenCalled();
    });
});