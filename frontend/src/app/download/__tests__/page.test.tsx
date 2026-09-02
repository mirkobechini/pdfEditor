import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";

// Mock next-intl
vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}));

// Mock next/link
vi.mock("next/link", () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

// Mock LandingNavbar
vi.mock("../../components/landing/LandingNavbar", () => ({
    default: () => <nav>LandingNavbar</nav>,
}));

// Mock global fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch as any;

const GITHUB_API = "https://api.github.com/repos/mirkobechini/pdfEditor/releases";
const CHANGELOG_URL =
    "https://raw.githubusercontent.com/mirkobechini/pdfEditor/dev/changelog.json";

function mockRelease(tag: string, assets: { name: string; browser_download_url: string }[]) {
    return { tag_name: tag, name: tag, assets };
}

function mockJsonResponse(data: unknown) {
    return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(data),
    });
}

const desktopReleases = [
    mockRelease("v0.1.36", [
        { name: "PdfEditor_0.1.36_x64-setup.exe", browser_download_url: "https://exe" },
        { name: "PdfEditor_0.1.36_aarch64.dmg", browser_download_url: "https://dmg" },
        { name: "PdfEditor_0.1.36_amd64.AppImage", browser_download_url: "https://appimage" },
        { name: "PdfEditor_0.1.36_amd64.deb", browser_download_url: "https://deb" },
    ]),
    mockRelease("v0.2.1-mobile", [
        { name: "app-v0.2.1.apk", browser_download_url: "https://apk" },
    ]),
];

const changelogData = {
    desktop: [{ version: "v0.1.36", date: "2026-08-27", changes: ["Test coverage"] }],
    mobile: [{ version: "v0.2.1-mobile", date: "2026-08-27", changes: ["Mobile fix"] }],
};

describe("DownloadPage", () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    it("shows loading state initially", async () => {
        mockFetch.mockImplementation(() => new Promise(() => { }));
        const DownloadPage = (await import("../page")).default;
        render(<DownloadPage />);
        expect(screen.getByText("Loading releases...")).toBeInTheDocument();
    });

    it("renders desktop and mobile releases with download links", async () => {
        mockFetch.mockResolvedValueOnce(mockJsonResponse(desktopReleases));
        mockFetch.mockResolvedValueOnce(mockJsonResponse(changelogData));

        const DownloadPage = (await import("../page")).default;
        render(<DownloadPage />);

        await waitFor(() => {
            expect(screen.getByText("Desktop App")).toBeInTheDocument();
        });

        // Desktop section
        expect(screen.getAllByText("v0.1.36").length).toBeGreaterThan(0);
        expect(screen.getByText("Download Installer")).toBeInTheDocument();
        expect(screen.getByText("Download DMG")).toBeInTheDocument();
        expect(screen.getByText("Download AppImage")).toBeInTheDocument();
        expect(screen.getByText("Download DEB")).toBeInTheDocument();

        // Mobile section
        expect(screen.getByText("Mobile App")).toBeInTheDocument();
        expect(screen.getAllByText("v0.2.1-mobile").length).toBeGreaterThan(0);
        // Web section
        expect(screen.getByText("Web App")).toBeInTheDocument();
        expect(screen.getByText("Open Web App")).toBeInTheDocument();

        // Changelog
        expect(screen.getByText("Test coverage")).toBeInTheDocument();
        expect(screen.getByText("Mobile fix")).toBeInTheDocument();
    });

    it("shows Not available when assets are missing", async () => {
        mockFetch
            .mockResolvedValueOnce(
                mockJsonResponse([
                    mockRelease("v0.1.36", []),
                ]),
            )
            .mockResolvedValueOnce(mockJsonResponse(null));

        const DownloadPage = (await import("../page")).default;
        render(<DownloadPage />);

        await waitFor(() => {
            expect(screen.getByText("Desktop App")).toBeInTheDocument();
        });

        expect(screen.getAllByText("Not available").length).toBeGreaterThan(0);
    });

    it("handles fetch failure gracefully", async () => {
        mockFetch.mockRejectedValue(new Error("Network error"));

        const DownloadPage = (await import("../page")).default;
        render(<DownloadPage />);

        await waitFor(() => {
            expect(screen.queryByText("Loading releases...")).not.toBeInTheDocument();
        });

        // No desktop/mobile sections rendered
        expect(screen.queryByText("Desktop App")).not.toBeInTheDocument();
        expect(screen.queryByText("Mobile App")).not.toBeInTheDocument();
        // Web section always renders
        expect(screen.getByText("Web App")).toBeInTheDocument();
    });

    it("renders feature comparison table", async () => {
        mockFetch
            .mockResolvedValueOnce(mockJsonResponse([]))
            .mockResolvedValueOnce(mockJsonResponse(null));

        const DownloadPage = (await import("../page")).default;
        render(<DownloadPage />);

        await waitFor(() => {
            expect(screen.getByText("Feature Comparison")).toBeInTheDocument();
        });

        expect(screen.getByText("Upload PDF")).toBeInTheDocument();
        expect(screen.getByText("Merge PDFs")).toBeInTheDocument();
        expect(screen.getByText("Replace Text")).toBeInTheDocument();
    });
});