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
});
