import React from "react";
import { render, screen } from "@testing-library/react";
import LandingCTA from "./LandingCTA";

describe("LandingCTA", () => {
    it("renders CTA section with title", () => {
        render(<LandingCTA />);

        expect(screen.getByText("title")).toBeInTheDocument();
    });

    it("renders CTA description", () => {
        render(<LandingCTA />);

        expect(screen.getByText("description")).toBeInTheDocument();
    });

    it("renders CTA button link to register", () => {
        render(<LandingCTA />);

        const button = screen.getByRole("link", { name: /cta/i });
    });
