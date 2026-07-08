import React from "react";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import LandingPricing from "../components/landing/LandingPricing";
import en from "../../messages/en.json";

const mockMessages = en;

describe("LandingPricing", () => {
    it("renders pricing section with title", () => {
        render(
            <NextIntlClientProvider locale="en" messages={mockMessages}>
                <LandingPricing />
            </NextIntlClientProvider>
        );

        expect(screen.getByText("Simple and transparent pricing")).toBeInTheDocument();
    });

    it("renders all 3 pricing plans", () => {
        render(
            <NextIntlClientProvider locale="en" messages={mockMessages}>
                <LandingPricing />
            </NextIntlClientProvider>
        );

        // Check for plan titles
        expect(screen.getByText("Free")).toBeInTheDocument();
        expect(screen.getByText("Premium")).toBeInTheDocument();
        expect(screen.getByText("Enterprise")).toBeInTheDocument();
    });

    it("renders pricing amounts", () => {
        render(
            <NextIntlClientProvider locale="en" messages={mockMessages}>
                <LandingPricing />
            </NextIntlClientProvider>
        );

        expect(screen.getByText("€0")).toBeInTheDocument();
        expect(screen.getAllByText("€9")[0]).toBeInTheDocument();
        expect(screen.getAllByText("€29")[0]).toBeInTheDocument();
    });

    it("renders CTA buttons for each plan", () => {
        render(
            <NextIntlClientProvider locale="en" messages={mockMessages}>
                <LandingPricing />
            </NextIntlClientProvider>
        );

        // Get all buttons with the CTA text
        const getStartedButtons = screen.getAllByRole("link", { name: /Get Started|Choose Premium|Contact Us/i });
        expect(getStartedButtons.length).toBeGreaterThanOrEqual(2); // At least free and premium buttons
    });

    it("highlights premium plan as most popular", () => {
        render(
            <NextIntlClientProvider locale="en" messages={mockMessages}>
                <LandingPricing />
            </NextIntlClientProvider>
        );

        expect(screen.getByText("MOST POPULAR")).toBeInTheDocument();
    });
});
