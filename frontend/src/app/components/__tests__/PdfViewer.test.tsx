import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import PdfViewer from "../PdfViewer";

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}));

const defaultProps = {
    fileUrl: null as string | null,
    currentPage: 1,
    totalPages: 0,
    requiresPassword: false,
    passwordError: null as string | null,
    onUnlock: vi.fn(),
    zoom: 1,
    onZoomChange: vi.fn(),
    onPageChange: vi.fn(),
    onTotalPagesChange: vi.fn(),
};

// Mock PDF.js globally
beforeEach(() => {
    (window as any).pdfjsLib = {
        GlobalWorkerOptions: { workerSrc: "" },
        getDocument: vi.fn().mockReturnValue({
            promise: Promise.resolve({
                numPages: 5,
                getPage: vi.fn().mockResolvedValue({
                    getViewport: vi.fn().mockReturnValue({ width: 800, height: 600 }),
                    render: vi.fn().mockReturnValue({
                        promise: Promise.resolve(),
                        cancel: vi.fn(),
                    }),
                }),
            }),
        }),
    };
});

describe("PdfViewer", () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it("shows select prompt when no file selected", () => {
        render(<PdfViewer {...defaultProps} />);
        expect(screen.getByText("selectPdf")).toBeInTheDocument();
    });

    it("shows drag-and-drop helper text", () => {
        render(<PdfViewer {...defaultProps} />);
        expect(screen.getByText("dragAndDrop")).toBeInTheDocument();
    });

    it("shows password prompt when PDF is protected", () => {
        render(<PdfViewer {...defaultProps} requiresPassword={true} />);
        expect(screen.getByText("passwordRequired")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("passwordPlaceholder")).toBeInTheDocument();
    });

    it("calls onUnlock when password submitted", () => {
        const onUnlock = vi.fn();
        render(<PdfViewer {...defaultProps} requiresPassword={true} onUnlock={onUnlock} />);
        fireEvent.change(screen.getByPlaceholderText("passwordPlaceholder"), { target: { value: "mypass" } });
        fireEvent.click(screen.getByText("unlock"));
        expect(onUnlock).toHaveBeenCalledWith("mypass");
    });

    it("disables submit button when password is empty", () => {
        const onUnlock = vi.fn();
        render(<PdfViewer {...defaultProps} requiresPassword={true} onUnlock={onUnlock} />);
        const btn = screen.getByText("unlock").closest("button");
        expect(btn).toBeDisabled();
    });

    it("shows password error message", () => {
        render(<PdfViewer {...defaultProps} requiresPassword={true} passwordError="Wrong password" />);
        expect(screen.getByText("Wrong password")).toBeInTheDocument();
    });

    it("renders canvas when fileUrl is provided", () => {
        render(<PdfViewer {...defaultProps} fileUrl="blob:test" totalPages={5} />);
        const canvas = document.querySelector("canvas");
        expect(canvas).toBeInTheDocument();
    });

    it("calls onPageChange when PDF loads", async () => {
        const onPageChange = vi.fn();
        const onTotalPagesChange = vi.fn();
        const onZoomChange = vi.fn();
        render(
            <PdfViewer
                {...defaultProps}
                fileUrl="blob:test"
                totalPages={0}
                onPageChange={onPageChange}
                onTotalPagesChange={onTotalPagesChange}
                onZoomChange={onZoomChange}
            />,
        );
        await vi.waitFor(() => {
            expect(onTotalPagesChange).toHaveBeenCalledWith(5);
            expect(onPageChange).toHaveBeenCalledWith(1);
            expect(onZoomChange).toHaveBeenCalledWith(1);
        });
    });

    it("handles drag-over state on empty viewer", () => {
        render(<PdfViewer {...defaultProps} />);
        const dropZone = screen.getByText("selectPdf").closest("div")!;
        fireEvent.dragOver(dropZone);
        expect(screen.getByText("dropToUpload")).toBeInTheDocument();
        fireEvent.dragLeave(dropZone);
        expect(screen.queryByText("dropToUpload")).not.toBeInTheDocument();
    });

    it("calls onFileDrop when a PDF is dropped", () => {
        const onFileDrop = vi.fn();
        render(<PdfViewer {...defaultProps} onFileDrop={onFileDrop} />);
        const dropZone = screen.getByText("selectPdf").closest("div")!;
        const file = new File(["content"], "test.pdf", { type: "application/pdf" });
        fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });
        expect(onFileDrop).toHaveBeenCalledWith(file);
    });

    it("shows alert when non-PDF file is dropped", () => {
        const alertMock = vi.spyOn(window, "alert").mockImplementation(() => { });
        render(<PdfViewer {...defaultProps} />);
        const dropZone = screen.getByText("selectPdf").closest("div")!;
        const file = new File(["content"], "test.txt", { type: "text/plain" });
        fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });
        expect(alertMock).toHaveBeenCalledWith("uploadOnlyPdf");
        alertMock.mockRestore();
    });

    it("calls onFileDrop on viewer when fileUrl is present", async () => {
        const onFileDrop = vi.fn();
        render(
            <PdfViewer
                {...defaultProps}
                fileUrl="blob:test"
                totalPages={5}
                onFileDrop={onFileDrop}
            />,
        );
        await vi.waitFor(() => {
            expect(document.querySelector("canvas")).toBeInTheDocument();
        });
        const file = new File(["content"], "test.pdf", { type: "application/pdf" });
        const canvasContainer = document.querySelector("canvas")!.closest("div")!;
        fireEvent.drop(canvasContainer.parentElement!, { dataTransfer: { files: [file] } });
        expect(onFileDrop).toHaveBeenCalled();
    });

    it("shows unlocking state in password form", async () => {
        const onUnlock = vi.fn().mockImplementation(() => new Promise(() => { }));
        render(
            <PdfViewer
                {...defaultProps}
                requiresPassword={true}
                onUnlock={onUnlock}
            />,
        );
        fireEvent.change(screen.getByPlaceholderText("passwordPlaceholder"), { target: { value: "mypass" } });
        fireEvent.click(screen.getByText("unlock"));
        expect(await screen.findByText("rendering")).toBeInTheDocument();
    });
});
