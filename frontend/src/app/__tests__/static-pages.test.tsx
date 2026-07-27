import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock next-intl globally
vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}));

// Mock next/link
vi.mock("next/link", () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) =>
        <a href={href}>{children}</a>,
}));

describe("Static Pages", () => {
    const pages = [
        { name: "CookiesPage", path: "../cookies/page", titleText: "Cookie Policy" },
        { name: "DocsPage", path: "../docs/page", titleText: "title" },
        { name: "FaqPage", path: "../faq/page", titleText: "title" },
        { name: "GuidePage", path: "../guide/page", titleText: "title" },
        { name: "PrivacyPage", path: "../privacy/page", titleText: "Privacy Policy" },
        { name: "RoadmapPage", path: "../roadmap/page", titleText: "title" },
        { name: "StatusPage", path: "../status/page", titleText: "title" },
        { name: "TermsPage", path: "../terms/page", titleText: "title" },
    ];

    pages.forEach(({ name, path, titleText }) => {
        describe(name, () => {
            it("renders heading", async () => {
                const Page = (await import(path)).default;
                render(<Page />);
                expect(screen.getByRole("heading", { level: 1, name: titleText })).toBeTruthy();
            });

            it("renders PdfEditor brand link", async () => {
                const Page = (await import(path)).default;
                render(<Page />);
                const brand = screen.getByText("PdfEditor");
                expect(brand).toBeTruthy();
            });

            it("renders back to landing link", async () => {
                const Page = (await import(path)).default;
                render(<Page />);
                const link = screen.getByText("PdfEditor").closest("a");
                expect(link?.getAttribute("href")).toBe("/landing");
            });
        });
    });
});