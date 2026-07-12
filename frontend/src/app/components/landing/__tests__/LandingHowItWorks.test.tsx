import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import LandingHowItWorks from "../LandingHowItWorks";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

describe("LandingHowItWorks", () => {
    it("renders how it works section", () => {
        render(<LandingHowItWorks />);
        expect(screen.getByText("title")).toBeInTheDocument();
    });
});