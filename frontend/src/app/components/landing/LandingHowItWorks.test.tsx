import React from "react";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import LandingHowItWorks from "../components/landing/LandingHowItWorks";
import en from "../../messages/en.json";

const mockMessages = en;

describe("LandingHowItWorks", () => {
    it("renders how it works section with title", () => {
        render(
            <NextIntlClientProvider locale="en" messages={mockMessages}>
                <LandingHowItWorks />
            </NextIntlClientProvider>
        );

        expect(screen.getByText("How it works")).toBeInTheDocument();
    });

    it("renders all 3 steps", () => {
        render(
            <NextIntlClientProvider locale="en" messages={mockMessages}>
                <LandingHowItWorks />
            </NextIntlClientProvider>
        );

        expect(screen.getByText("Upload your PDF")).toBeInTheDocument();
        expect(screen.getByText("Edit")).toBeInTheDocument();
        expect(screen.getByText("Download the result")).toBeInTheDocument();
    });

    it("displays step numbers", () => {
        render(
            <NextIntlClientProvider locale="en" messages={mockMessages}>
                <LandingHowItWorks />
            </NextIntlClientProvider>
        );

        // The step numbers should be rendered as text in circles
        const text = screen.getByText("1").textContent;
        expect(text).toContain("1");
    });
});
