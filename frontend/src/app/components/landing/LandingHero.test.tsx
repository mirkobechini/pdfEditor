import React from "react";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import LandingHero from "./LandingHero";
import en from "../../../../messages/en.json";

const mockMessages = en;

describe("LandingHero", () => {
    it("renders hero section with title", () => {
        render(
            <NextIntlClientProvider locale="en" messages={mockMessages}>
                <LandingHero />
            </NextIntlClientProvider>
        );

        // Check for title
        expect(screen.getByText("Your PDF editor")).toBeInTheDocument();
        expect(screen.getByText("simple, fast, offline")).toBeInTheDocument();
    });

    it("renders CTA buttons", () => {
        render(
            <NextIntlClientProvider locale="en" messages={mockMessages}>
                <LandingHero />
            </NextIntlClientProvider>
        );

        // Check for primary CTA button
        const primaryButton = screen.getByRole("link", { name: /Get Started Free/i });
        expect(primaryButton).toBeInTheDocument();
        expect(primaryButton).toHaveAttribute("href", "/register");

        // Check for secondary CTA
        const secondaryButton = screen.getByRole("link", { name: /Learn More/i });
        expect(secondaryButton).toBeInTheDocument();
        expect(secondaryButton).toHaveAttribute("href", "#features");
    });

    it("renders badge", () => {
        render(
            <NextIntlClientProvider locale="en" messages={mockMessages}>
                <LandingHero />
            </NextIntlClientProvider>
        );

        expect(screen.getByText("New: Edit text in PDFs")).toBeInTheDocument();
    });

    it("renders mockup section", () => {
        render(
            <NextIntlClientProvider locale="en" messages={mockMessages}>
                <LandingHero />
            </NextIntlClientProvider>
        );

        expect(screen.getByText("Live preview of your PDF")).toBeInTheDocument();
    });
});
