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
    onCompress: vi.fn(),
    onImportExport: vi.fn(),
    onPrint: vi.fn(),
    onSign: vi.fn(),
    onShare: vi.fn(),
    onAnnotate: vi.fn(),
    onOcr: vi.fn(),
    onDownload: vi.fn(),
    canUndo: true,
    canRedo: false,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
};

// Apre un menu a tendina cliccandone l'header, poi clicca la voce.
function openMenuAndClick(menuText: string, itemText: string) {
    fireEvent.click(screen.getByText(new RegExp(`^${menuText} ▾$`)));
    fireEvent.click(screen.getByText(new RegExp(`^${itemText}$`)));
}

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

    it("calls onMerge when merge button is clicked (menu Organizza)", () => {
        const onMerge = vi.fn();
        render(<Toolbar {...defaultProps} onMerge={onMerge} />);
        openMenuAndClick("organize", "merge");
        expect(onMerge).toHaveBeenCalled();
    });

    it("calls onSplit when split button is clicked (menu Organizza)", () => {
        const onSplit = vi.fn();
        render(<Toolbar {...defaultProps} onSplit={onSplit} />);
        openMenuAndClick("organize", "split");
        expect(onSplit).toHaveBeenCalled();
    });

    it("calls onReorder when reorder button is clicked (menu Organizza)", () => {
        const onReorder = vi.fn();
        render(<Toolbar {...defaultProps} onReorder={onReorder} />);
        openMenuAndClick("organize", "reorder");
        expect(onReorder).toHaveBeenCalled();
    });

    it("calls onRemovePages when remove button is clicked (menu Organizza)", () => {
        const onRemovePages = vi.fn();
        render(<Toolbar {...defaultProps} onRemovePages={onRemovePages} />);
        openMenuAndClick("organize", "remove");
        expect(onRemovePages).toHaveBeenCalled();
    });

    it("calls onReplaceText when replace text button is clicked (menu Converti)", () => {
        const onReplaceText = vi.fn();
        render(<Toolbar {...defaultProps} onReplaceText={onReplaceText} />);
        openMenuAndClick("convert", "replaceText");
        expect(onReplaceText).toHaveBeenCalled();
    });

    it("calls onMetadata when metadata button is clicked (menu Converti)", () => {
        const onMetadata = vi.fn();
        render(<Toolbar {...defaultProps} onMetadata={onMetadata} />);
        openMenuAndClick("convert", "metadata");
        expect(onMetadata).toHaveBeenCalled();
    });

    it("calls onProtect when protect button is clicked (diretta)", () => {
        const onProtect = vi.fn();
        render(<Toolbar {...defaultProps} onProtect={onProtect} />);
        fireEvent.click(screen.getByText("protect"));
        expect(onProtect).toHaveBeenCalled();
    });

    it("chiude il menu Organizza dopo il click su una voce (single action per ap)", () => {
        const onReorganize = vi.fn();
        render(<Toolbar {...defaultProps} onReorder={onReorganize} />);
        openMenuAndClick("organize", "reorder");
        expect(onReorganize).toHaveBeenCalled();
        // il menu è chiuso: le voci non devono essere più presenti
        expect(screen.queryByText(/^reorder$/)).not.toBeInTheDocument();
    });

    it("calls onDownload when download button is clicked (diretta)", () => {
        const onDownload = vi.fn();
        render(<Toolbar {...defaultProps} onDownload={onDownload} />);
        fireEvent.click(screen.getByText(/^download$/));
        expect(onDownload).toHaveBeenCalled();
    });

    it("disables download when canUndo is false (nessun documento selezionato)", () => {
        render(<Toolbar {...defaultProps} canUndo={false} />);
        const btn = screen.getByTestId("toolbar-download");
        expect(btn).toBeDisabled();
    });

    it("calls onPageChange when prev/next buttons are clicked", () => {
        const onPageChange = vi.fn();
        render(<Toolbar {...defaultProps} currentPage={3} totalPages={5} onPageChange={onPageChange} />);
        const buttons = screen.getAllByRole("button");
        const prevBtn = buttons.find(b => b.textContent === "\u25C0")!;
        fireEvent.click(prevBtn);
        expect(onPageChange).toHaveBeenCalledWith(2);
        const nextBtn = buttons.find(b => b.textContent === "\u25B6")!;
        fireEvent.click(nextBtn);
        expect(onPageChange).toHaveBeenCalledWith(4);
    });

    it("disables prev on first page", () => {
        render(<Toolbar {...defaultProps} currentPage={1} totalPages={5} />);
        const buttons = screen.getAllByRole("button");
        const prevBtn = buttons.find(b => b.textContent === "\u25C0")!;
        expect(prevBtn).toBeDisabled();
    });

    it("disables next on last page", () => {
        render(<Toolbar {...defaultProps} currentPage={5} totalPages={5} />);
        const buttons = screen.getAllByRole("button");
        const nextBtn = buttons.find(b => b.textContent === "\u25B6")!;
        expect(nextBtn).toBeDisabled();
    });

    it("disables prev and next when totalPages is 0", () => {
        render(<Toolbar {...defaultProps} currentPage={0} totalPages={0} />);
        const buttons = screen.getAllByRole("button");
        const prevBtn = buttons.find(b => b.textContent === "\u25C0")!;
        const nextBtn = buttons.find(b => b.textContent === "\u25B6")!;
        expect(prevBtn).toBeDisabled();
        expect(nextBtn).toBeDisabled();
    });

    it("calls onZoomChange with zoomed out value", () => {
        const onZoomChange = vi.fn();
        render(<Toolbar {...defaultProps} zoom={1} onZoomChange={onZoomChange} />);
        const buttons = screen.getAllByText("\u2796")!;
        fireEvent.click(buttons[0]);
        expect(onZoomChange).toHaveBeenCalledWith(0.75);
    });

    it("clamps zoom to minimum 0.25", () => {
        const onZoomChange = vi.fn();
        render(<Toolbar {...defaultProps} zoom={0.25} onZoomChange={onZoomChange} />);
        const buttons = screen.getAllByText("\u2796")!;
        fireEvent.click(buttons[0]);
        expect(onZoomChange).toHaveBeenCalledWith(0.25);
    });

    it("clamps zoom to maximum 4", () => {
        const onZoomChange = vi.fn();
        render(<Toolbar {...defaultProps} zoom={4} onZoomChange={onZoomChange} />);
        const buttons = screen.getAllByText("\u2795")!;
        fireEvent.click(buttons[0]);
        expect(onZoomChange).toHaveBeenCalledWith(4);
    });

    it("calls onZoomChange with zoomed in value", () => {
        const onZoomChange = vi.fn();
        render(<Toolbar {...defaultProps} zoom={1} onZoomChange={onZoomChange} />);
        const buttons = screen.getAllByText("\u2795")!;
        fireEvent.click(buttons[0]);
        expect(onZoomChange).toHaveBeenCalledWith(1.25);
    });

    it("shows zoom percentage", () => {
        render(<Toolbar {...defaultProps} zoom={0.5} />);
        expect(screen.getByText("50%")).toBeInTheDocument();
    });

    it("calls onPageChange on page input change within range", () => {
        const onPageChange = vi.fn();
        render(<Toolbar {...defaultProps} totalPages={10} onPageChange={onPageChange} />);
        const input = screen.getByRole("spinbutton");
        fireEvent.change(input, { target: { value: "5" } });
        expect(onPageChange).toHaveBeenCalledWith(5);
    });

    it("does not call onPageChange on page input out of range", () => {
        const onPageChange = vi.fn();
        render(<Toolbar {...defaultProps} totalPages={10} onPageChange={onPageChange} />);
        const input = screen.getByRole("spinbutton");
        fireEvent.change(input, { target: { value: "99" } });
        expect(onPageChange).not.toHaveBeenCalled();
    });
});