import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ShareDialog from "../ShareDialog";

const mockOnClose = vi.fn();
const mockListShareLinks = vi.fn();
const mockCreateShareLink = vi.fn();
const mockRevokeShareLink = vi.fn();

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));

vi.mock("../../shared/api", () => ({
    api: {
        listShareLinks: (...args: any[]) => mockListShareLinks(...args),
        createShareLink: (...args: any[]) => mockCreateShareLink(...args),
        revokeShareLink: (...args: any[]) => mockRevokeShareLink(...args),
    },
}));

const baseProps = {
    open: true,
    pdfId: "p1",
    onClose: mockOnClose,
};

describe("ShareDialog", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockListShareLinks.mockResolvedValue([]);
    });

    it("renders title and create button", () => {
        render(<ShareDialog {...baseProps} />);
        expect(screen.getByText("title")).toBeInTheDocument();
        expect(screen.getByTestId("share-create")).toBeInTheDocument();
    });

    it("creates a share link", async () => {
        mockCreateShareLink.mockResolvedValue({ token: "t1", url: "http://x/t1" });
        render(<ShareDialog {...baseProps} />);
        fireEvent.click(screen.getByTestId("share-create"));
        await waitFor(() => expect(mockCreateShareLink).toHaveBeenCalled());
    });

    it("shows error on create failure", async () => {
        mockCreateShareLink.mockRejectedValue(new Error("fail"));
        render(<ShareDialog {...baseProps} />);
        fireEvent.click(screen.getByTestId("share-create"));
        await waitFor(() => expect(screen.getByTestId("share-error")).toBeInTheDocument());
    });

    it("returns null when closed", () => {
        render(<ShareDialog {...baseProps} open={false} />);
        expect(screen.queryByTestId("share-create")).not.toBeInTheDocument();
    });
});