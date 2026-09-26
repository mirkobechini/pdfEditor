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
const mockCloudListShareLinks = vi.fn();
const mockCloudCreateShareLink = vi.fn();
const mockCloudRevokeShareLink = vi.fn();
const mockCloudUploadPdf = vi.fn();
const mockDownloadPdf = vi.fn();
vi.mock("../../shared/api", () => ({
    api: {
        listShareLinks: (...args: any[]) => mockListShareLinks(...args),
        createShareLink: (...args: any[]) => mockCreateShareLink(...args),
        revokeShareLink: (...args: any[]) => mockRevokeShareLink(...args),
        downloadPdf: (...args: any[]) => mockDownloadPdf(...args),
    },
    cloudApi: {
        listShareLinks: (...args: any[]) => mockCloudListShareLinks(...args),
        createShareLink: (...args: any[]) => mockCloudCreateShareLink(...args),
        revokeShareLink: (...args: any[]) => mockCloudRevokeShareLink(...args),
        uploadPdf: (...args: any[]) => mockCloudUploadPdf(...args),
    },
}));

// Mock tauri detection — tests run in web mode (not Tauri)
const mockIsTauri = vi.fn(() => false);
vi.mock("../../shared/tauri", () => ({
    isTauri: (...args: any[]) => mockIsTauri(...args),
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

    it("shows 'copied' only for the link that was actually copied (regression)", async () => {
        const twoLinks = [
            mockLinks[0],
            { ...mockLinks[0], token: "tok2", url: "http://localhost:3000/share/tok2" },
        ];
        mockListShareLinks.mockResolvedValue(twoLinks);
        Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });

        render(<ShareDialog open={true} onClose={() => { }} pdfId="p1" />);
        await screen.findByText("http://localhost:3000/share/tok1");

        fireEvent.click(screen.getByTestId("share-copy-tok1"));

        expect(screen.getByTestId("share-copy-tok1")).toHaveTextContent("copied");
        expect(screen.getByTestId("share-copy-tok2")).toHaveTextContent("copy");
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

    // ─── Desktop (Tauri) path: uploads to cloud then creates link ──
    it("uploads PDF to cloud and creates link in Tauri mode", async () => {
        mockIsTauri.mockReturnValue(true);
        mockCloudUploadPdf.mockResolvedValue({ id: "cloud-1" });
        mockCloudListShareLinks.mockResolvedValue([]);
        mockCloudCreateShareLink.mockResolvedValue({
            id: "cl1",
            pdf_id: "cloud-1",
            token: "ctok1",
            url: "https://pdfeditor.mirkobechini.com/share/ctok1",
            has_password: false,
            expires_at: null,
            created_at: "2026-01-01",
        });
        mockDownloadPdf.mockResolvedValue(new Blob());

        render(<ShareDialog open={true} onClose={() => { }} pdfId="p1" />);
        await screen.findByTestId("share-empty");

        fireEvent.click(screen.getByTestId("share-create"));

        await waitFor(() => {
            expect(mockCloudUploadPdf).toHaveBeenCalled();
            expect(mockCloudCreateShareLink).toHaveBeenCalledWith("cloud-1", undefined, undefined);
        });
        expect(screen.getByText("https://pdfeditor.mirkobechini.com/share/ctok1")).toBeInTheDocument();
    });

    it("reuses existing cloud mapping without re-uploading", async () => {
        mockIsTauri.mockReturnValue(true);
        // Pre-seed the sync map so the PDF is already on the cloud.
        localStorage.setItem("pdfeditor_sync_id_map", JSON.stringify({ p1: "cloud-1" }));
        mockCloudListShareLinks.mockResolvedValue([]);
        mockCloudCreateShareLink.mockResolvedValue({
            id: "cl2",
            pdf_id: "cloud-1",
            token: "ctok2",
            url: "https://pdfeditor.mirkobechini.com/share/ctok2",
            has_password: false,
            expires_at: null,
            created_at: "2026-01-01",
        });

        render(<ShareDialog open={true} onClose={() => { }} pdfId="p1" />);
        await screen.findByTestId("share-empty");

        fireEvent.click(screen.getByTestId("share-create"));

        await waitFor(() => {
            expect(mockCloudUploadPdf).not.toHaveBeenCalled();
            expect(mockCloudCreateShareLink).toHaveBeenCalledWith("cloud-1", undefined, undefined);
        });
        localStorage.removeItem("pdfeditor_sync_id_map");
    });
});
