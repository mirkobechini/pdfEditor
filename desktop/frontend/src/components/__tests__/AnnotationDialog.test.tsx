import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import AnnotationDialog from "../AnnotationDialog";

// Mock next-intl
vi.mock("next-intl", () => {
    const t = (key: string) => key;
    return { useTranslations: () => t };
});

// Mock api
const mockAddAnnotation = vi.fn();
vi.mock("../../shared/api", () => ({
    api: {
        addAnnotation: (...args: any[]) => mockAddAnnotation(...args),
    },
}));

vi.mock("../PositionSelector", () => ({
    default: ({ onPositionChange }: any) => (
        <div data-testid="position-selector">
            <button onClick={() => onPositionChange(120, 80)}>set-pos</button>
        </div>
    ),
}));

describe("AnnotationDialog", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAddAnnotation.mockResolvedValue({ id: "p1" });
    });

    it("returns null when closed", () => {
        render(<AnnotationDialog open={false} onClose={() => { }} pdfId="p1" currentPage={1} />);
        expect(screen.queryByText("title")).not.toBeInTheDocument();
    });

    it("renders annotation form when open", () => {
        render(<AnnotationDialog open={true} onClose={() => { }} pdfId="p1" currentPage={1} />);
        expect(screen.getByTestId("annotation-type")).toBeInTheDocument();
        expect(screen.getByTestId("annotation-color")).toBeInTheDocument();
        expect(screen.getByTestId("annotation-page")).toBeInTheDocument();
    });

    it("saves a highlight annotation", async () => {
        const onClose = vi.fn();
        const onSuccess = vi.fn();
        render(<AnnotationDialog open={true} onClose={onClose} pdfId="p1" currentPage={1} onSuccess={onSuccess} />);

        fireEvent.click(screen.getByTestId("annotation-save"));

        await waitFor(() => {
            expect(mockAddAnnotation).toHaveBeenCalledWith("p1", {
                page: 1,
                type: "highlight",
                rect: [50, 50, 250, 150],
                color: "#FFFF00",
                content: null,
                opacity: 0.3,
            });
        });
        expect(onSuccess).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
    });

    it("uses position selected via PositionSelector", async () => {
        render(<AnnotationDialog open={true} onClose={() => { }} pdfId="p1" currentPage={1} />);

        // Move the position box to (120, 80)
        fireEvent.click(screen.getByText("set-pos"));

        fireEvent.click(screen.getByTestId("annotation-save"));

        await waitFor(() => {
            expect(mockAddAnnotation).toHaveBeenCalledWith("p1", {
                page: 1,
                type: "highlight",
                rect: [120, 80, 320, 180],
                color: "#FFFF00",
                content: null,
                opacity: 0.3,
            });
        });
    });

    it("shows content field for text annotation", () => {
        render(<AnnotationDialog open={true} onClose={() => { }} pdfId="p1" currentPage={1} />);
        fireEvent.change(screen.getByTestId("annotation-type"), { target: { value: "text" } });
        expect(screen.getByTestId("annotation-content")).toBeInTheDocument();
    });

    it("saves text annotation with content", async () => {
        render(<AnnotationDialog open={true} onClose={() => { }} pdfId="p1" currentPage={1} />);
        fireEvent.change(screen.getByTestId("annotation-type"), { target: { value: "text" } });
        fireEvent.change(screen.getByTestId("annotation-content"), { target: { value: "Hello" } });
        fireEvent.click(screen.getByTestId("annotation-save"));

        await waitFor(() => {
            expect(mockAddAnnotation).toHaveBeenCalledWith("p1", {
                page: 1,
                type: "text",
                rect: [50, 50, 250, 150],
                color: "#FFFF00",
                content: "Hello",
                opacity: 0.3,
            });
        });
    });

    it("shows error when save fails", async () => {
        mockAddAnnotation.mockRejectedValue(new Error("network"));
        render(<AnnotationDialog open={true} onClose={() => { }} pdfId="p1" currentPage={1} />);

        fireEvent.click(screen.getByTestId("annotation-save"));

        expect(await screen.findByTestId("annotation-error")).toBeInTheDocument();
    });
});
