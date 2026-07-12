import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import LandingCTA from "../LandingCTA";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

describe("LandingCTA", () => {
    it("renders CTA section", () => {
        render(<LandingCTA />);
        expect(screen.getByText("title")).toBeInTheDocument();
    });
});