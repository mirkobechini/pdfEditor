import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

describe("PdfViewer", () => {
    it("shows select prompt when no file selected", () => {
        render(<PdfViewer {...defaultProps} />);
        expect(screen.getByText("selectPdf")).toBeInTheDocument();
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

    it("shows password error message", () => {
        render(<PdfViewer {...defaultProps} requiresPassword={true} passwordError="Wrong password" />);
        expect(screen.getByText("Wrong password")).toBeInTheDocument();
    });

    it("renders canvas when fileUrl is provided", () => {
        render(<PdfViewer {...defaultProps} fileUrl="blob:test" totalPages={5} />);
        expect(screen.getByText("rendering")).toBeInTheDocument();
    });
});
