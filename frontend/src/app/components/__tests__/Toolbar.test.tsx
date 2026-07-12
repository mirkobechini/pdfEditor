import { describe, it, expect, vi } from "vitest";
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
    canUndo: false,
    canRedo: false,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
};

describe("Toolbar", () => {
    it("renders all action buttons", () => {
        render(<Toolbar {...defaultProps} />);
        expect(screen.getByText("merge")).toBeInTheDocument();
        expect(screen.getByText("split")).toBeInTheDocument();
        expect(screen.getByText("reorder")).toBeInTheDocument();
        expect(screen.getByText("remove")).toBeInTheDocument();
        expect(screen.getByText("replaceText")).toBeInTheDocument();
        expect(screen.getByText("metadata")).toBeInTheDocument();
        expect(screen.getByText("protect")).toBeInTheDocument();
    });

    it("calls onMerge when merge button clicked", () => {
        const onMerge = vi.fn();
        render(<Toolbar {...defaultProps} onMerge={onMerge} />);
        fireEvent.click(screen.getByText("merge"));
        expect(onMerge).toHaveBeenCalled();
    });

    it("calls onSplit when split button clicked", () => {
        const onSplit = vi.fn();
        render(<Toolbar {...defaultProps} onSplit={onSplit} />);
        fireEvent.click(screen.getByText("split"));
        expect(onSplit).toHaveBeenCalled();
    });

    it("disables undo button when canUndo is false", () => {
        render(<Toolbar {...defaultProps} canUndo={false} />);
        expect(screen.getByTitle("Undo (Ctrl+Z)")).toBeDisabled();
    });

    it("enables undo button when canUndo is true", () => {
        render(<Toolbar {...defaultProps} canUndo={true} />);
        expect(screen.getByTitle("Undo (Ctrl+Z)")).not.toBeDisabled();
    });

    it("calls onUndo when undo clicked", () => {
        const onUndo = vi.fn();
        render(<Toolbar {...defaultProps} canUndo={true} onUndo={onUndo} />);
        fireEvent.click(screen.getByTitle("Undo (Ctrl+Z)"));
        expect(onUndo).toHaveBeenCalled();
    });

    it("renders page navigation", () => {
        render(<Toolbar {...defaultProps} currentPage={3} totalPages={10} />);
        expect(screen.getByRole("spinbutton")).toBeInTheDocument();
        expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    });

    it("calls onPageChange when page input changes", () => {
        const onPageChange = vi.fn();
        render(<Toolbar {...defaultProps} onPageChange={onPageChange} />);
        const input = screen.getByDisplayValue("1");
        fireEvent.change(input, { target: { value: "3" } });
        expect(onPageChange).toHaveBeenCalledWith(3);
    });

    it("renders zoom control", () => {
        render(<Toolbar {...defaultProps} zoom={1.5} />);
        const zoomSpan = screen.getByText("150%"); expect(zoomSpan).toBeInTheDocument();
    });
});
