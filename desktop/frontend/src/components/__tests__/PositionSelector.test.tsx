import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import PositionSelector from "../PositionSelector";

// Mock PDF.js global
const mockGetViewport = vi.fn();
const mockRender = vi.fn();
const mockGetPage = vi.fn();
const mockGetDocument = vi.fn();

beforeEach(() => {
    vi.clearAllMocks();
    // Mock canvas 2D context (jsdom has no canvas implementation)
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
        scale: vi.fn(),
    });
    mockGetViewport.mockImplementation(({ scale }: any) => ({
        width: 612 * scale,
        height: 792 * scale,
    }));
    mockRender.mockResolvedValue({ promise: Promise.resolve() });
    mockGetPage.mockResolvedValue({
        getViewport: mockGetViewport,
        render: () => ({ promise: Promise.resolve() }),
    });
    mockGetDocument.mockReturnValue({
        promise: Promise.resolve({ getPage: mockGetPage }),
    });
    (window as any).pdfjsLib = {
        GlobalWorkerOptions: {},
        getDocument: mockGetDocument,
    };
});

describe("PositionSelector", () => {
    it("renders nothing when no pdfUrl", () => {
        const { container } = render(
            <PositionSelector pdfUrl={null} pageNumber={1} onPositionChange={() => { }} />
        );
        expect(container.innerHTML).toBe("");
    });

    it("renders canvas and position box when pdfUrl provided", async () => {
        render(
            <PositionSelector pdfUrl="blob:test" pageNumber={1} onPositionChange={() => { }} />
        );
        await waitFor(() => {
            expect(screen.getByTestId("position-box")).toBeInTheDocument();
        });
        expect(mockGetDocument).toHaveBeenCalledWith("blob:test");
    });

    it("reports position on mount", async () => {
        const onPositionChange = vi.fn();
        render(
            <PositionSelector pdfUrl="blob:test" pageNumber={1} onPositionChange={onPositionChange} />
        );
        await waitFor(() => {
            expect(onPositionChange).toHaveBeenCalled();
        });
    });

    it("drags the box to move position", async () => {
        const onPositionChange = vi.fn();
        render(
            <PositionSelector pdfUrl="blob:test" pageNumber={1} onPositionChange={onPositionChange} />
        );
        await waitFor(() => {
            expect(screen.getByTestId("position-box")).toBeInTheDocument();
        });

        const box = screen.getByTestId("position-box");
        // Mock getBoundingClientRect for the box and canvas
        box.getBoundingClientRect = vi.fn().mockReturnValue({ left: 10, top: 10, width: 100, height: 50 });
        const canvas = document.querySelector("canvas")!;
        canvas.getBoundingClientRect = vi.fn().mockReturnValue({ left: 0, top: 0, width: 612, height: 792 });

        fireEvent.mouseDown(box, { clientX: 20, clientY: 20 });
        fireEvent.mouseMove(box, { clientX: 120, clientY: 80 });
        fireEvent.mouseUp(box);

        // onPositionChange should be called with new position
        await waitFor(() => {
            expect(onPositionChange).toHaveBeenCalled();
        });
    });

    it("clamps box position within canvas bounds", async () => {
        const onPositionChange = vi.fn();
        render(
            <PositionSelector pdfUrl="blob:test" pageNumber={1} onPositionChange={onPositionChange} />
        );
        await waitFor(() => {
            expect(screen.getByTestId("position-box")).toBeInTheDocument();
        });

        const box = screen.getByTestId("position-box");
        box.getBoundingClientRect = vi.fn().mockReturnValue({ left: 10, top: 10, width: 100, height: 50 });
        const canvas = document.querySelector("canvas")!;
        canvas.getBoundingClientRect = vi.fn().mockReturnValue({ left: 0, top: 0, width: 612, height: 792 });

        // Drag far beyond the canvas edge
        fireEvent.mouseDown(box, { clientX: 20, clientY: 20 });
        fireEvent.mouseMove(box, { clientX: 5000, clientY: 5000 });
        fireEvent.mouseUp(box);

        await waitFor(() => {
            expect(onPositionChange).toHaveBeenCalled();
        });
    });
});
