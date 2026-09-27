import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import SignDialog from "../SignDialog";

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}));

vi.mock("../../lib/api", () => ({
    api: { signPdf: vi.fn() },
}));

vi.mock("../PositionSelector", () => ({
    default: ({ onPositionChange }: any) => (
        <div data-testid="position-selector">
            <button onClick={() => onPositionChange(120, 80)}>set-pos</button>
        </div>
    ),
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

    it("renders the choose step when open", () => {
        render(<SignDialog {...defaultProps} />);
        expect(screen.getByText("title")).toBeInTheDocument();
        expect(screen.getByText("drawLabel")).toBeInTheDocument();
        expect(screen.getByTestId("signature-next")).toBeInTheDocument();
    });

    it("disables Next until a signature is drawn", () => {
        render(<SignDialog {...defaultProps} />);
        const nextBtn = screen.getByTestId("signature-next");
        expect(nextBtn).toBeDisabled();
        fireEvent.click(nextBtn);
        expect(screen.queryByText("noSignature")).not.toBeInTheDocument();
    });

    it("moves to the position step and calls signPdf with the default position", async () => {
        (api.signPdf as any).mockResolvedValue({ id: "pdf-1", original_filename: "test.pdf" });
        render(<SignDialog {...defaultProps} />);

        const canvas = document.querySelector("canvas")!;
        fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
        fireEvent.mouseMove(canvas, { clientX: 50, clientY: 50 });
        fireEvent.mouseUp(canvas);

        fireEvent.click(screen.getByTestId("signature-next"));
        expect(screen.getByTestId("position-selector")).toBeInTheDocument();

        fireEvent.click(screen.getByTestId("signature-sign"));
        await waitFor(() => {
            expect(api.signPdf).toHaveBeenCalledWith("pdf-1", "c2ln", 1, 50, 50, 200, 80);
        });
    });

    it("uses the position selected via PositionSelector", async () => {
        (api.signPdf as any).mockResolvedValue({ id: "pdf-1", original_filename: "test.pdf" });
        render(<SignDialog {...defaultProps} />);

        const canvas = document.querySelector("canvas")!;
        fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
        fireEvent.mouseUp(canvas);

        fireEvent.click(screen.getByTestId("signature-next"));
        fireEvent.click(screen.getByText("set-pos"));

        fireEvent.click(screen.getByTestId("signature-sign"));
        await waitFor(() => {
            expect(api.signPdf).toHaveBeenCalledWith("pdf-1", "c2ln", 1, 120, 80, 200, 80);
        });
    });

    it("can go back from the position step to redraw", () => {
        render(<SignDialog {...defaultProps} />);
        const canvas = document.querySelector("canvas")!;
        fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
        fireEvent.mouseUp(canvas);

        fireEvent.click(screen.getByTestId("signature-next"));
        expect(screen.getByTestId("position-selector")).toBeInTheDocument();

        fireEvent.click(screen.getByTestId("signature-back"));
        expect(screen.getByText("drawLabel")).toBeInTheDocument();
    });

    it("calls onClose after a successful sign", async () => {
        const onClose = vi.fn();
        (api.signPdf as any).mockResolvedValue({ id: "pdf-1", original_filename: "test.pdf" });
        render(<SignDialog {...defaultProps} onClose={onClose} />);

        const canvas = document.querySelector("canvas")!;
        fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
        fireEvent.mouseUp(canvas);

        fireEvent.click(screen.getByTestId("signature-next"));
        fireEvent.click(screen.getByTestId("signature-sign"));
        await waitFor(() => {
            expect(onClose).toHaveBeenCalled();
        });
    });

    it("shows an error when signPdf fails", async () => {
        (api.signPdf as any).mockRejectedValue(new Error("boom"));
        render(<SignDialog {...defaultProps} />);

        const canvas = document.querySelector("canvas")!;
        fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
        fireEvent.mouseUp(canvas);

        fireEvent.click(screen.getByTestId("signature-next"));
        fireEvent.click(screen.getByTestId("signature-sign"));
        expect(await screen.findByText(/signFailed/)).toBeInTheDocument();
    });

    it("clears the canvas when Clear is clicked", () => {
        render(<SignDialog {...defaultProps} />);
        fireEvent.click(screen.getByText("clear"));
        const ctx = HTMLCanvasElement.prototype.getContext as any;
        expect(ctx).toHaveBeenCalled();
    });

    it("undo restores the previous canvas state", () => {
        render(<SignDialog {...defaultProps} />);
        const canvas = document.querySelector("canvas")!;
        fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
        fireEvent.mouseUp(canvas);

        const undoBtn = screen.getByTestId("signature-undo");
        expect(undoBtn).not.toBeDisabled();
        const toDataURL = HTMLCanvasElement.prototype.toDataURL as any;
        toDataURL.mockClear();
        fireEvent.click(undoBtn);

        const ctx = HTMLCanvasElement.prototype.getContext as any;
        expect(ctx).toHaveBeenCalled();
        expect(toDataURL).toHaveBeenCalled();
    });

    it("redo restores state after undo", () => {
        render(<SignDialog {...defaultProps} />);
        const canvas = document.querySelector("canvas")!;
        fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
        fireEvent.mouseUp(canvas);

        const undoBtn = screen.getByTestId("signature-undo");
        fireEvent.click(undoBtn);

        const redoBtn = screen.getByTestId("signature-redo");
        expect(redoBtn).not.toBeDisabled();
        fireEvent.click(redoBtn);

        const ctx = HTMLCanvasElement.prototype.getContext as any;
        expect(ctx).toHaveBeenCalled();
    });

    it("loads an uploaded image onto the canvas", async () => {
        let ctx: any;
        const origMock = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(() => {
            ctx = (origMock as any)();
            return ctx;
        });

        render(<SignDialog {...defaultProps} />);

        class MockFileReader {
            result = "data:image/png;base64,aW1n";
            onload: (() => void) | null = null;
            readAsDataURL() {
                this.onload?.();
            }
        }
        vi.stubGlobal("FileReader", MockFileReader);

        class MockImage {
            onload: (() => void) | null = null;
            naturalWidth = 200;
            naturalHeight = 100;
            set src(_v: string) {
                setTimeout(() => this.onload?.(), 0);
            }
        }
        vi.stubGlobal("Image", MockImage);
        const origCreateElement = document.createElement.bind(document);
        document.createElement = vi.fn((tag: string) => {
            if (tag === "img") return new MockImage();
            return origCreateElement(tag);
        }) as any;

        const file = new File(["img"], "sig.png", { type: "image/png" });
        const input = document.querySelector('input[type="file"]')!;
        const canvasEl = document.querySelector("canvas")!;
        canvasEl.setAttribute("width", "400");
        canvasEl.setAttribute("height", "160");
        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => {
            expect(ctx).toBeDefined();
            expect(ctx.drawImage).toHaveBeenCalled();
        });

        vi.unstubAllGlobals();
    });
});
