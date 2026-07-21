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
        { name: "CookiesPage", path: "../cookies/page", titleKey: "title" },
        { name: "DocsPage", path: "../docs/page", titleKey: "title" },
        { name: "FaqPage", path: "../faq/page", titleKey: "title" },
        { name: "GuidePage", path: "../guide/page", titleKey: "title" },
        { name: "PrivacyPage", path: "../privacy/page", titleKey: "title" },
        { name: "RoadmapPage", path: "../roadmap/page", titleKey: "title" },
        { name: "StatusPage", path: "../status/page", titleKey: "title" },
        { name: "TermsPage", path: "../terms/page", titleKey: "title" },
    ];

    pages.forEach(({ name, path, titleKey }) => {
        describe(name, () => {
            it("renders heading with translation key", async () => {
                const Page = (await import(path)).default;
                render(<Page />);
                expect(screen.getByText(titleKey)).toBeTruthy();
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