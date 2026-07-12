import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import LandingFeatures from "../LandingFeatures";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

describe("LandingFeatures", () => {
    it("renders features section", () => {
        render(<LandingFeatures />);
        expect(screen.getByText("title")).toBeInTheDocument();
    });
});