import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import ShareDialog from "../ShareDialog";

// Mock next-intl
vi.mock("next-intl", () => {
    const t = (key: string) => key;
    return { useTranslations: () => t };
});

// Mock api
const mockListShareLinks = vi.fn();
const mockCreateShareLink = vi.fn();
const mockRevokeShareLink = vi.fn();
vi.mock("../../lib/api", () => ({
    api: {
        listShareLinks: (...args: any[]) => mockListShareLinks(...args),
        createShareLink: (...args: any[]) => mockCreateShareLink(...args),
        revokeShareLink: (...args: any[]) => mockRevokeShareLink(...args),
    },
}));

const mockLinks = [
    {
        id: "l1",
        pdf_id: "p1",
        token: "tok1",
        url: "http://localhost:3000/share/tok1",
        has_password: false,
        expires_at: null,
        created_at: "2026-01-01",
    },
];

describe("ShareDialog", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockListShareLinks.mockResolvedValue(mockLinks);
        mockCreateShareLink.mockResolvedValue({
            id: "l2",
            pdf_id: "p1",
            token: "tok2",
            url: "http://localhost:3000/share/tok2",
            has_password: false,
            expires_at: null,
            created_at: "2026-01-02",
        });
        mockRevokeShareLink.mockResolvedValue(undefined);
    });

    it("returns null when closed", () => {
        render(<ShareDialog open={false} onClose={() => { }} pdfId="p1" />);
        expect(screen.queryByText("title")).not.toBeInTheDocument();
    });

    it("loads and displays existing links", async () => {
        render(<ShareDialog open={true} onClose={() => { }} pdfId="p1" />);
        await waitFor(() => {
            expect(mockListShareLinks).toHaveBeenCalledWith("p1");
        });
        expect(screen.getByText("http://localhost:3000/share/tok1")).toBeInTheDocument();
    });

    it("creates a new share link", async () => {
        render(<ShareDialog open={true} onClose={() => { }} pdfId="p1" />);
        await screen.findByText("http://localhost:3000/share/tok1");

        fireEvent.click(screen.getByTestId("share-create"));

        await waitFor(() => {
            expect(mockCreateShareLink).toHaveBeenCalledWith("p1", undefined, undefined);
        });
        expect(screen.getByText("http://localhost:3000/share/tok2")).toBeInTheDocument();
    });

    it("creates a share link with password and expiry", async () => {
        render(<ShareDialog open={true} onClose={() => { }} pdfId="p1" />);
        await screen.findByText("http://localhost:3000/share/tok1");

        fireEvent.change(screen.getByTestId("share-password"), { target: { value: "secret" } });
        fireEvent.change(screen.getByTestId("share-expiry"), { target: { value: "7" } });
        fireEvent.click(screen.getByTestId("share-create"));

        await waitFor(() => {
            expect(mockCreateShareLink).toHaveBeenCalledWith("p1", "secret", 7);
        });
    });

    it("revokes a share link", async () => {
        render(<ShareDialog open={true} onClose={() => { }} pdfId="p1" />);
        await screen.findByText("http://localhost:3000/share/tok1");

        fireEvent.click(screen.getByTestId("share-revoke-tok1"));

        await waitFor(() => {
            expect(mockRevokeShareLink).toHaveBeenCalledWith("p1", "tok1");
        });
        expect(screen.queryByText("http://localhost:3000/share/tok1")).not.toBeInTheDocument();
    });

    it("shows empty state when no links", async () => {
        mockListShareLinks.mockResolvedValue([]);
        render(<ShareDialog open={true} onClose={() => { }} pdfId="p1" />);
        expect(await screen.findByTestId("share-empty")).toBeInTheDocument();
    });

    it("shows error when loading fails", async () => {
        mockListShareLinks.mockRejectedValue(new Error("network"));
        render(<ShareDialog open={true} onClose={() => { }} pdfId="p1" />);
        expect(await screen.findByTestId("share-error")).toBeInTheDocument();
    });
});