import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BrowsePage from "../page";

// Mock next-intl — return a STABLE t function so useCallback deps don't change
vi.mock("next-intl", () => {
    const t = (key: string) => key;
    return { useTranslations: () => t };
});

// Mock documentsApi
const mockListDocuments = vi.fn();
const mockSearchDocuments = vi.fn();
vi.mock("../../../lib/documentsApi", () => ({
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

    it("renders title and search input", async () => {
        render(<BrowsePage />);
        expect(screen.getByText("title")).toBeInTheDocument();
        expect(screen.getByTestId("browse-search-input")).toBeInTheDocument();
        await waitFor(() => expect(mockListDocuments).toHaveBeenCalled());
    });

    it("renders document cards", async () => {
        render(<BrowsePage />);
        await waitFor(() => expect(screen.getAllByTestId("document-card").length).toBe(2));
    });

    it("searches documents", async () => {
        render(<BrowsePage />);
        await waitFor(() => expect(mockListDocuments).toHaveBeenCalled());
        fireEvent.change(screen.getByTestId("browse-search-input"), { target: { value: "test" } });
        fireEvent.click(screen.getByTestId("browse-search-button"));
        await waitFor(() => expect(mockSearchDocuments).toHaveBeenCalledWith("test", 1, 12));
    });

    it("shows error on failure", async () => {
        mockListDocuments.mockRejectedValue(new Error("fail"));
        render(<BrowsePage />);
        await waitFor(() => expect(screen.getByTestId("browse-error")).toBeInTheDocument());
    });
});