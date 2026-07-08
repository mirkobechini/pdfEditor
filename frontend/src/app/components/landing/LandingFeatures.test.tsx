import React from "react";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import LandingFeatures from "../components/landing/LandingFeatures";
import en from "../../messages/en.json";

const mockMessages = en;

describe("LandingFeatures", () => {
    it("renders features section with title", () => {
        render(
            <NextIntlClientProvider locale="en" messages={mockMessages}>
                <LandingFeatures />
            </NextIntlClientProvider>
        );

        expect(screen.getByText("Everything you need")).toBeInTheDocument();
    });

    it("renders all 6 feature cards", () => {
        render(
            <NextIntlClientProvider locale="en" messages={mockMessages}>
                <LandingFeatures />
            </NextIntlClientProvider>
        );

        // Check for feature titles
        expect(screen.getByText("Merge PDFs")).toBeInTheDocument();
        expect(screen.getByText("Split PDFs")).toBeInTheDocument();
        expect(screen.getByText("Reorder Pages")).toBeInTheDocument();
        expect(screen.getByText("Edit Text")).toBeInTheDocument();
        expect(screen.getByText("Unlock PDFs")).toBeInTheDocument();
        expect(screen.getByText("Metadata & Info")).toBeInTheDocument();
    });

    it("renders feature descriptions", () => {
        render(
            <NextIntlClientProvider locale="en" messages={mockMessages}>
                <LandingFeatures />
            </NextIntlClientProvider>
        );

        expect(screen.getByText(/Combine multiple documents/i)).toBeInTheDocument();
        expect(screen.getByText(/Extract specific pages/i)).toBeInTheDocument();
    });
});
