import React from "react";
import { render, screen } from "@testing-library/react";
import LandingHero from "./LandingHero";

describe("LandingHero", () => {
    it("renders hero section with title", () => {
        render(<LandingHero />);

        // Check for title (using mock key returns)
        expect(screen.getByText("title")).toBeInTheDocument();
        expect(screen.getByText("subtitle")).toBeInTheDocument();
    });

    it("renders CTA buttons", () => {
        render(<LandingHero />);

        // Check for primary CTA button
        const primaryButton = screen.getByRole("link", { name: /ctaPrimary/i });
        expect(primaryButton).toBeInTheDocument();
        expect(primaryButton).toHaveAttribute("href", "/register");

        // Check for secondary CTA
        const secondaryButton = screen.getByRole("link", { name: /ctaSecondary/i });
        expect(secondaryButton).toBeInTheDocument();
        expect(secondaryButton).toHaveAttribute("href", "#features");
    });

    it("renders badge", () => {
        render(<LandingHero />);

        expect(screen.getByText("badge")).toBeInTheDocument();
    });

    it("renders mockup section", () => {
        render(<LandingHero />);

        expect(screen.getByText("mockupText")).toBeInTheDocument();
    });
});