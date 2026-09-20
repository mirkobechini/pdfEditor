import React from "react";
import { render, screen } from "@testing-library/react";
import LandingFeatures from "./LandingFeatures";

describe("LandingFeatures", () => {
    it("renders features section with title", () => {
        render(<LandingFeatures />);

        expect(screen.getByText("title")).toBeInTheDocument();
    });

    it("renders all 14 feature cards", () => {
        render(<LandingFeatures />);

        // Each feature should render (titles use mocked keys)
        expect(screen.getByText("merge.title")).toBeInTheDocument();
        expect(screen.getByText("split.title")).toBeInTheDocument();
        expect(screen.getByText("reorder.title")).toBeInTheDocument();
        expect(screen.getByText("edittext.title")).toBeInTheDocument();
        expect(screen.getByText("unlock.title")).toBeInTheDocument();
        expect(screen.getByText("metadata.title")).toBeInTheDocument();
        expect(screen.getByText("importexport.title")).toBeInTheDocument();
        expect(screen.getByText("docx.title")).toBeInTheDocument();
        expect(screen.getByText("print.title")).toBeInTheDocument();
        expect(screen.getByText("sign.title")).toBeInTheDocument();
        expect(screen.getByText("multiselect.title")).toBeInTheDocument();
        expect(screen.getByText("sharelink.title")).toBeInTheDocument();
        expect(screen.getByText("annotations.title")).toBeInTheDocument();
        expect(screen.getByText("ocr.title")).toBeInTheDocument();
    });

    it("renders feature descriptions", () => {
        render(<LandingFeatures />);

        // Descriptions also render with mocked keys
        expect(screen.getByText("merge.description")).toBeInTheDocument();
    });
});