import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import Toolbar from "../Toolbar";

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}));

const defaultProps = {
    currentPage: 1,
    totalPages: 5,
    onPageChange: vi.fn(),
    zoom: 1,
    onZoomChange: vi.fn(),
    onMerge: vi.fn(),
    onSplit: vi.fn(),
    onReorder: vi.fn(),
    onRemovePages: vi.fn(),
    onReplaceText: vi.fn(),
    onMetadata: vi.fn(),
    onProtect: vi.fn(),
    canUndo: true,
    canRedo: false,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
};

describe("Toolbar", () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it("renders undo/redo buttons", () => {
        render(<Toolbar {...defaultProps} />);
        expect(screen.getByText("\u21A9")).toBeInTheDocument();
        expect(screen.getByText("\u21AA")).toBeInTheDocument();
    });

    it("disables undo when canUndo is false", () => {
        render(<Toolbar {...defaultProps} canUndo={false} />);
        expect(screen.getByText("\u21A9").closest("button")).toBeDisabled();
    });

    it("disables redo when canRedo is false", () => {
        render(<Toolbar {...defaultProps} canRedo={false} />);
        expect(screen.getByText("\u21AA").closest("button")).toBeDisabled();
    });

    it("calls onUndo on Ctrl+Z", () => {
        const onUndo = vi.fn();
        render(<Toolbar {...defaultProps} onUndo={onUndo} />);
        fireEvent.keyDown(window, { key: "z", ctrlKey: true });
        expect(onUndo).toHaveBeenCalled();
    });

    it("calls onRedo on Ctrl+Shift+Z", () => {
        const onRedo = vi.fn();
        render(<Toolbar {...defaultProps} onRedo={onRedo} />);
        fireEvent.keyDown(window, { key: "z", ctrlKey: true, shiftKey: true });
        expect(onRedo).toHaveBeenCalled();
    });

    it("calls onMerge when merge button is clicked", () => {
        const onMerge = vi.fn();
        render(<Toolbar {...defaultProps} onMerge={onMerge} />);
        fireEvent.click(screen.getByText("merge"));
        expect(onMerge).toHaveBeenCalled();
    });

    it("calls onPageChange when prev/next buttons are clicked", () => {
        const onPageChange = vi.fn();
        render(<Toolbar {...defaultProps} currentPage={3} totalPages={5} onPageChange={onPageChange} />);
        const buttons = screen.getAllByRole("button");
        const prevBtn = buttons.find(b => b.textContent === "\u25C0")!;
        fireEvent.click(prevBtn);
        expect(onPageChange).toHaveBeenCalledWith(2);
    });
});
