import React from "react";
import { render, screen } from "@testing-library/react";
import LandingFeatures from "./LandingFeatures";

describe("LandingFeatures", () => {
    it("renders features section with title", () => {
        render(<LandingFeatures />);

        expect(screen.getByText("title")).toBeInTheDocument();
    });

    it("renders all 6 feature cards", () => {
        render(<LandingFeatures />);

        // Each feature should render (titles use mocked keys)
        expect(screen.getByText("merge.title")).toBeInTheDocument();
        expect(screen.getByText("split.title")).toBeInTheDocument();
        expect(screen.getByText("reorder.title")).toBeInTheDocument();
        expect(screen.getByText("edittext.title")).toBeInTheDocument();
        expect(screen.getByText("unlock.title")).toBeInTheDocument();
        expect(screen.getByText("metadata.title")).toBeInTheDocument();
    });

    it("renders feature descriptions", () => {
        render(<LandingFeatures />);

        // Descriptions also render with mocked keys
        expect(screen.getByText("merge.description")).toBeInTheDocument();
