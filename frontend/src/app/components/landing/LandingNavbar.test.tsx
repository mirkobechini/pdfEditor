import React from "react";
import { render, screen } from "@testing-library/react";
import LandingNavbar from "./LandingNavbar";

describe("LandingNavbar", () => {
    it("renders navbar with logo", () => {
        render(<LandingNavbar />);

        expect(screen.getByText("PdfEditor")).toBeInTheDocument();
    });

    it("renders auth buttons", () => {
        render(<LandingNavbar />);

        expect(screen.getByRole("link", { name: /login/i })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /register/i })).toBeInTheDocument();
    });

    it("renders auth buttons with correct hrefs", () => {
        render(<LandingNavbar />);

        const links = screen.getAllByRole("link");
        const loginLink = links.find(link => link.getAttribute("href") === "/login");
        const registerLink = links.find(link => link.getAttribute("href") === "/register");

        expect(loginLink).toBeDefined();
        expect(registerLink).toBeDefined();
    });

    it("renders logo link to home", () => {
        render(<LandingNavbar />);

        const logoLinks = screen.getAllByRole("link");
        const homeLink = logoLinks.find(link => link.getAttribute("href") === "/");

        expect(homeLink).toBeDefined();
