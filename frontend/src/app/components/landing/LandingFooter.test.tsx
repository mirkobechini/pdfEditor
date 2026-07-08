import React from "react";
import { render, screen } from "@testing-library/react";
import LandingFooter from "./LandingFooter";

describe("LandingFooter", () => {
    it("renders footer with brand section", () => {
        render(<LandingFooter />);

        expect(screen.getByText("PdfEditor")).toBeInTheDocument();
    });

    it("renders all footer column titles", () => {
        render(<LandingFooter />);

        expect(screen.getByText("product.title")).toBeInTheDocument();
        expect(screen.getByText("resources.title")).toBeInTheDocument();
        expect(screen.getByText("legal.title")).toBeInTheDocument();
    });

    it("renders copyright text", () => {
        render(<LandingFooter />);

        expect(screen.getByText("copyright")).toBeInTheDocument();
