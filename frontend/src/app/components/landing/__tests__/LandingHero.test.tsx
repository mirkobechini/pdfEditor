import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import LandingHero from "../LandingHero";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

describe("LandingHero", () => {
    it("renders hero title", () => {
        render(<LandingHero />);
        expect(screen.getByText("title")).toBeInTheDocument();
    });

    it("renders CTA button", () => {
        render(<LandingHero />);
        expect(screen.getByText("ctaPrimary")).toBeInTheDocument();
    });
});