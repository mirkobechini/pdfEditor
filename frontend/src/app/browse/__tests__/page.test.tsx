import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import BrowsePage from "../page";

// Mock next-intl — return a STABLE t function so useCallback deps don't change
vi.mock("next-intl", () => {
    const t = (key: string) => key;
    return { useTranslations: () => t };
});

// Mock documentsApi
const mockListDocuments = vi.fn();
const mockSearchDocuments = vi.fn();
vi.mock("../../lib/documentsApi", () => ({
    documentsApi: {
        listDocuments: (...args: any[]) => mockListDocuments(...args),
        searchDocuments: (...args: any[]) => mockSearchDocuments(...args),
    },
}));

const mockDocs = {
    total: 2,
    page: 1,
    page_size: 12,
    items: [
        {
            id: 1,
            identifier: "doc1",
            title: "Test Document One",
            authors: ["Author A"],
            subjects: [],
            languages: ["en"],
            copyright: false,
            media_type: "texts",
            download_count: 100,
            pdf_url: "https://archive.org/download/doc1/doc1.pdf",
            text_url: null,
            cover_url: null,
            created_at: null,
            updated_at: null,
        },
        {
            id: 2,
            identifier: "doc2",
            title: "Test Document Two",
            authors: [],
            subjects: [],
            languages: ["it"],
            copyright: false,
            media_type: "texts",
            download_count: 0,
            pdf_url: "https://archive.org/download/doc2/doc2.pdf",
            text_url: null,
            cover_url: null,
            created_at: null,
            updated_at: null,
        },
    ],
};

describe("BrowsePage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockListDocuments.mockResolvedValue(mockDocs);
        mockSearchDocuments.mockResolvedValue(mockDocs);
    });

    it("renders documents from the microservice", async () => {
        render(<BrowsePage />);
        await waitFor(() => {
            expect(mockListDocuments).toHaveBeenCalledWith(1, 12);
        });
        expect(await screen.findByText("Test Document One")).toBeInTheDocument();
        expect(screen.getByText("Test Document Two")).toBeInTheDocument();
    });

    it("shows loading state initially", () => {
        mockListDocuments.mockReturnValue(new Promise(() => { }));
        render(<BrowsePage />);
        expect(screen.getByTestId("browse-loading")).toBeInTheDocument();
    });

    it("shows error when the microservice is unreachable", async () => {
        mockListDocuments.mockRejectedValue(new Error("network error"));
        render(<BrowsePage />);
        expect(await screen.findByTestId("browse-error")).toBeInTheDocument();
    });

    it("shows empty state when no documents", async () => {
        mockListDocuments.mockResolvedValue({ total: 0, page: 1, page_size: 12, items: [] });
        render(<BrowsePage />);
        expect(await screen.findByTestId("browse-empty")).toBeInTheDocument();
    });

    it("searches documents on submit", async () => {
        render(<BrowsePage />);
        await screen.findByText("Test Document One");

        fireEvent.change(screen.getByTestId("browse-search-input"), {
            target: { value: "test" },
        });
        fireEvent.submit(screen.getByTestId("browse-search-input").closest("form")!);

        await waitFor(() => {
            expect(mockSearchDocuments).toHaveBeenCalledWith("test", 1, 12);
        });
    });

    it("shows author fallback for unknown author", async () => {
        render(<BrowsePage />);
        expect(await screen.findByText("unknownAuthor")).toBeInTheDocument();
    });
});
