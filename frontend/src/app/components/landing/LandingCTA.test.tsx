import React from "react";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import LandingCTA from "./LandingCTA";
import en from "../../../../messages/en.json";

const mockMessages = en;

describe("LandingCTA", () => {
    it("renders CTA section with title", () => {
        render(
            <NextIntlClientProvider locale="en" messages={mockMessages}>
                <LandingCTA />
            </NextIntlClientProvider>
        );

        expect(screen.getByText("Ready to simplify your PDFs?")).toBeInTheDocument();
    });

    it("renders CTA description", () => {
        render(
            <NextIntlClientProvider locale="en" messages={mockMessages}>
                <LandingCTA />
            </NextIntlClientProvider>
        );

        expect(screen.getByText(/30 seconds/i)).toBeInTheDocument();
    });

    it("renders CTA button link to register", () => {
        render(
            <NextIntlClientProvider locale="en" messages={mockMessages}>
                <LandingCTA />
            </NextIntlClientProvider>
        );

        const button = screen.getByRole("link", { name: /Create your account/i });
        expect(button).toHaveAttribute("href", "/register");
    });
});
