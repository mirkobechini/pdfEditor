import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import AnnotationDialog from "../AnnotationDialog";

vi.mock("next-intl", () => {
    const t = (key: string) => key;
    return { useTranslations: () => t };
});

const mockAddAnnotation = vi.fn();
vi.mock("../../lib/api", () => ({
    api: { addAnnotation: (...args: any[]) => mockAddAnnotation(...args) },
}));

// Selettore finto: simula spostamento e ridimensionamento del box.
vi.mock("../PositionSelector", () => ({
    default: ({ onPositionChange, onSizeChange }: any) => (
        <button
            data-testid="move-box"
            onClick={() => {
                onPositionChange(300, 200);
                onSizeChange(100, 40);
            }}
        />
    ),
}));

describe("AnnotationDialog rect", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAddAnnotation.mockResolvedValue({ id: "p1" });
    });

    it("sends rect as [x0, y0, x1, y1] after moving and resizing the box", async () => {
        render(<AnnotationDialog open onClose={() => { }} pdfId="p1" currentPage={1} pdfUrl="/x.pdf" />);
        fireEvent.click(screen.getByTestId("move-box"));
        fireEvent.click(screen.getByText("save"));

        await waitFor(() => expect(mockAddAnnotation).toHaveBeenCalled());
        expect(mockAddAnnotation.mock.calls[0][1].rect).toEqual([300, 200, 400, 240]);
    });
});
