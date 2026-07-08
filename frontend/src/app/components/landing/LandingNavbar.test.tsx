import React from "react";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import LandingNavbar from "../components/landing/LandingNavbar";
import en from "../../messages/en.json";

const mockMessages = en;

describe("LandingNavbar", () => {
    it("renders navbar with logo", () => {
        render(
            <NextIntlClientProvider locale="en" messages={mockMessages}>
                <LandingNavbar />
            </NextIntlClientProvider>
        );

        expect(screen.getByText("PdfEditor")).toBeInTheDocument();
    });

    it("renders navigation links", () => {
        render(
            <NextIntlClientProvider locale="en" messages={mockMessages}>
                <LandingNavbar />
            </NextIntlClientProvider>
        );

        expect(screen.getByRole("link", { name: /Sign In/i })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /Sign Up Free/i })).toBeInTheDocument();
    });

    it("renders auth buttons with correct hrefs", () => {
        render(
            <NextIntlClientProvider locale="en" messages={mockMessages}>
                <LandingNavbar />
            </NextIntlClientProvider>
        );

        const loginLink = screen.getByRole("link", { name: /Sign In/i });
        const registerLink = screen.getByRole("link", { name: /Sign Up Free/i });

        expect(loginLink).toHaveAttribute("href", "/login");
        expect(registerLink).toHaveAttribute("href", "/register");
    });

    it("renders logo link to home", () => {
        render(
            <NextIntlClientProvider locale="en" messages={mockMessages}>
                <LandingNavbar />
            </NextIntlClientProvider>
        );

        const logoLink = screen.getAllByRole("link", { name: /PdfEditor/i })[0];
        expect(logoLink).toHaveAttribute("href", "/");
    });
});
