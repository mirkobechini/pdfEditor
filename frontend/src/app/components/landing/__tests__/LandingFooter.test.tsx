import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import LandingFooter from "../LandingFooter";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

describe("LandingFooter", () => {
    it("renders footer", () => {
        render(<LandingFooter />);
        expect(screen.getByText("brand")).toBeInTheDocument();
    });
});