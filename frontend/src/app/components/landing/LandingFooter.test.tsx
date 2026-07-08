import React from "react";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import LandingFooter from "./LandingFooter";
import en from "../../../messages/en.json";

const mockMessages = en;

describe("LandingFooter", () => {
    it("renders footer with brand section", () => {
        render(
            <NextIntlClientProvider locale="en" messages={mockMessages}>
                <LandingFooter />
            </NextIntlClientProvider>
        );

        expect(screen.getByText("PdfEditor")).toBeInTheDocument();
    });

    it("renders all footer column titles", () => {
        render(
            <NextIntlClientProvider locale="en" messages={mockMessages}>
                <LandingFooter />
            </NextIntlClientProvider>
        );

        expect(screen.getByText("Product")).toBeInTheDocument();
        expect(screen.getByText("Resources")).toBeInTheDocument();
        expect(screen.getByText("Legal")).toBeInTheDocument();
    });

    it("renders footer links", () => {
        render(
            <NextIntlClientProvider locale="en" messages={mockMessages}>
                <LandingFooter />
            </NextIntlClientProvider>
        );

        expect(screen.getByText("Features")).toBeInTheDocument();
        expect(screen.getByText("Pricing")).toBeInTheDocument();
        expect(screen.getByText("Privacy")).toBeInTheDocument();
    });

    it("renders copyright text", () => {
        render(
            <NextIntlClientProvider locale="en" messages={mockMessages}>
                <LandingFooter />
            </NextIntlClientProvider>
        );

        expect(screen.getByText(/All rights reserved/i)).toBeInTheDocument();
    });
});
