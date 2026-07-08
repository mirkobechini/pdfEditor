import React from "react";
import { render, screen } from "@testing-library/react";
import LandingHowItWorks from "./LandingHowItWorks";

describe("LandingHowItWorks", () => {
    it("renders how it works section with title", () => {
        render(<LandingHowItWorks />);

        expect(screen.getByText("title")).toBeInTheDocument();
    });

    it("renders all 3 steps", () => {
        render(<LandingHowItWorks />);

        expect(screen.getByText("step1.title")).toBeInTheDocument();
        expect(screen.getByText("step2.title")).toBeInTheDocument();
        expect(screen.getByText("step3.title")).toBeInTheDocument();
    });
});