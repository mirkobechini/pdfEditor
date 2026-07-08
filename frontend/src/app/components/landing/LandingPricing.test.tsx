import React from "react";
import { render, screen } from "@testing-library/react";
import LandingPricing from "./LandingPricing";

describe("LandingPricing", () => {
    it("renders pricing section with title", () => {
        render(<LandingPricing />);

        expect(screen.getByText("title")).toBeInTheDocument();
    });

    it("renders all 3 pricing plans", () => {
        render(<LandingPricing />);

        // Check for plan titles (mocked keys)
        expect(screen.getByText("free.title")).toBeInTheDocument();
        expect(screen.getByText("premium.title")).toBeInTheDocument();
        expect(screen.getByText("enterprise.title")).toBeInTheDocument();
    });

    it("renders pricing amounts", () => {
        render(<LandingPricing />);

        expect(screen.getByText("€0")).toBeInTheDocument();
        expect(screen.getAllByText(/€9|€29/)[0]).toBeInTheDocument();
    });

    it("highlights premium plan as most popular", () => {
        render(<LandingPricing />);

        expect(screen.getByText("mostPopular")).toBeInTheDocument();
    });
});