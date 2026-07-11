import React from "react";
import { render, screen } from "@testing-library/react";
import LandingNavbar from "./LandingNavbar";
import { AuthProvider } from "../../lib/auth";

// Mock api module
vi.mock("../../lib/api", () => ({
    api: {
        getMe: vi.fn().mockRejectedValue(new Error("Not authenticated")),
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
    },
}));

function renderWithAuth(ui: React.ReactElement) {
    return render(<AuthProvider>{ui}</AuthProvider>);
}

describe("LandingNavbar", () => {
    it("renders navbar with logo", () => {
        renderWithAuth(<LandingNavbar />);

        expect(screen.getByText("PdfEditor")).toBeInTheDocument();
    });

    it("renders auth buttons", () => {
        renderWithAuth(<LandingNavbar />);

        expect(screen.getByRole("link", { name: /login/i })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /register/i })).toBeInTheDocument();
    });

    it("renders auth buttons with correct hrefs", () => {
        renderWithAuth(<LandingNavbar />);

        const links = screen.getAllByRole("link");
        const loginLink = links.find(link => link.getAttribute("href") === "/login");
        const registerLink = links.find(link => link.getAttribute("href") === "/register");

        expect(loginLink).toBeDefined();
        expect(registerLink).toBeDefined();
    });

    it("renders logo link to home", () => {
        renderWithAuth(<LandingNavbar />);

        const logoLinks = screen.getAllByRole("link");
        const homeLink = logoLinks.find(link => link.getAttribute("href") === "/");

        expect(homeLink).toBeDefined();
    });
});