import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import Sidebar from "../Sidebar";

const mockFiles = {
    items: [
        { id: "1", original_filename: "doc1.pdf", file_size: 1000, page_count: 5, created_at: "2026-01-01", updated_at: "2026-01-01" },
        { id: "2", original_filename: "doc2.pdf", file_size: 2000, page_count: 10, created_at: "2026-01-02", updated_at: "2026-01-02" },
    ],
    total: 2,
};

vi.mock("../../lib/api", () => ({
    api: {
        listPdfs: vi.fn(),
        uploadPdfWithProgress: vi.fn(),
    },
}));

import { api } from "../../lib/api";

const defaultProps = {
    selectedId: null as string | null,
    onSelect: vi.fn(),
    onUpload: vi.fn(),
    onDeleteClick: vi.fn(),
};

beforeEach(() => {
    vi.clearAllMocks();
    (api.listPdfs as any).mockResolvedValue(mockFiles);
});

describe("Sidebar", () => {
    it("renders upload area", () => {
        render(<Sidebar {...defaultProps} />);
        expect(screen.getByText("dropHere")).toBeInTheDocument();
    });

    it("loads and displays files on mount", async () => {
        render(<Sidebar {...defaultProps} />);
        await waitFor(() => {
            expect(screen.getByText("doc1.pdf")).toBeInTheDocument();
        });
        expect(screen.getByText("doc2.pdf")).toBeInTheDocument();
    });

    it("shows loading state", () => {
        (api.listPdfs as any).mockImplementation(() => new Promise(() => { }));
        render(<Sidebar {...defaultProps} />);
        expect(screen.getByText("loading")).toBeInTheDocument();
    });

    it("shows empty state when no files", async () => {
        (api.listPdfs as any).mockResolvedValue({ items: [], total: 0 });
        render(<Sidebar {...defaultProps} />);
        await waitFor(() => {
            expect(screen.getByText("noPdfs")).toBeInTheDocument();
        });
    });

    it("calls onSelect when file is clicked", async () => {
        const onSelect = vi.fn();
        render(<Sidebar {...defaultProps} onSelect={onSelect} />);
        await waitFor(() => {
            fireEvent.click(screen.getByText("doc1.pdf"));
        });
        expect(onSelect).toHaveBeenCalledWith("1");
    });

    it("highlights selected file", async () => {
        render(<Sidebar {...defaultProps} selectedId="1" />);
        await waitFor(() => {
            const fileEl = screen.getByText("doc1.pdf").closest("div[class*='p-2']");
            expect(fileEl?.className).toContain("bg-blue");
        });
    });

    it("refetches when refreshKey changes", async () => {
        const { rerender } = render(<Sidebar {...defaultProps} refreshKey={0} />);
        await waitFor(() => expect(api.listPdfs).toHaveBeenCalledTimes(1));
        rerender(<Sidebar {...defaultProps} refreshKey={1} />);
        await waitFor(() => expect(api.listPdfs).toHaveBeenCalledTimes(2));
    });

    it("handles upload via file input", async () => {
        const onUpload = vi.fn();
        const onSelect = vi.fn();
        (api.uploadPdfWithProgress as any).mockResolvedValue({ id: "3", original_filename: "new.pdf" });

        render(<Sidebar {...defaultProps} onUpload={onUpload} onSelect={onSelect} />);

        const input = document.getElementById("file-input") as HTMLInputElement;
        const file = new File(["pdf content"], "test.pdf", { type: "application/pdf" });
        Object.defineProperty(input, "files", { value: [file] });
        fireEvent.change(input);

        await waitFor(() => {
            expect(api.uploadPdfWithProgress).toHaveBeenCalled();
        });
    });

    it("shows progress bar during upload", async () => {
        (api.uploadPdfWithProgress as any).mockImplementation((_file: File, onProgress: (p: number) => void) => {
            onProgress(50);
            return Promise.resolve({ id: "3", original_filename: "new.pdf" });
        });

        render(<Sidebar {...defaultProps} />);
        const input = document.getElementById("file-input") as HTMLInputElement;
        const file = new File(["pdf content"], "test.pdf", { type: "application/pdf" });
        Object.defineProperty(input, "files", { value: [file] });
        fireEvent.change(input);

        await waitFor(() => {
            expect(screen.getByText("50%")).toBeInTheDocument();
        });
    });

    it("shows error message when loadFiles fails", async () => {
        (api.listPdfs as any).mockRejectedValue(new Error("Network error"));
        render(<Sidebar {...defaultProps} />);
        await waitFor(() => {
            expect(screen.getByText("loadFailed")).toBeInTheDocument();
        });
    });
});
