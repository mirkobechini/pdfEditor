import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import AppLayout from "../AppLayout";

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}));

const mockUseAuth = vi.fn();
vi.mock("../../lib/auth", () => ({
    useAuth: () => mockUseAuth(),
}));

vi.mock("../BugReportDialog", () => ({
    default: ({ open, onClose }: any) => open ? <div data-testid="bug-dialog"><button onClick={onClose}>Close</button></div> : null,
}));

describe("AppLayout", () => {
    it("renders all three sections", () => {
        mockUseAuth.mockReturnValue({ user: { id: "1", email: "test@test.com", full_name: "Test User", is_admin: false }, loading: false, logout: vi.fn() });
        render(
            <AppLayout
                sidebar={<div data-testid="sidebar">Sidebar</div>}
                toolbar={<div data-testid="toolbar">Toolbar</div>}
                viewer={<div data-testid="viewer">Viewer</div>}
            />
        );
        expect(screen.getByTestId("sidebar")).toBeInTheDocument();
        expect(screen.getByTestId("toolbar")).toBeInTheDocument();
        expect(screen.getByTestId("viewer")).toBeInTheDocument();
    });

    it("shows user name and logout button", () => {
        mockUseAuth.mockReturnValue({ user: { id: "1", email: "test@test.com", full_name: "Test User", is_admin: false }, loading: false, logout: vi.fn() });
        render(<AppLayout sidebar={null} toolbar={null} viewer={null} />);
        expect(screen.getByText("Test User")).toBeInTheDocument();
        expect(screen.getByText("logout")).toBeInTheDocument();
    });

    it("shows admin link for admin users", () => {
        mockUseAuth.mockReturnValue({ user: { id: "1", email: "admin@test.com", full_name: "Admin", is_admin: true }, loading: false, logout: vi.fn() });
        render(<AppLayout sidebar={null} toolbar={null} viewer={null} />);
        expect(screen.getAllByText("Admin").length).toBeGreaterThanOrEqual(1);
    });

    it("opens and closes bug report dialog", () => {
        mockUseAuth.mockReturnValue({ user: { id: "1", email: "test@test.com", full_name: "Test User", is_admin: false }, loading: false, logout: vi.fn() });
        render(<AppLayout sidebar={null} toolbar={null} viewer={null} />);
        fireEvent.click(screen.getByText("button"));
        expect(screen.getByTestId("bug-dialog")).toBeInTheDocument();
        fireEvent.click(screen.getByText("Close"));
        expect(screen.queryByTestId("bug-dialog")).not.toBeInTheDocument();
    });

    it("toggles mobile sidebar", () => {
        mockUseAuth.mockReturnValue({ user: { id: "1", email: "test@test.com", full_name: "Test", is_admin: false }, loading: false, logout: vi.fn() });
        render(<AppLayout sidebar={<div>Sidebar</div>} toolbar={null} viewer={null} />);
        const hamburger = screen.getByText("\u2630");
        fireEvent.click(hamburger);
        expect(screen.getByText("\u2715")).toBeInTheDocument();
        fireEvent.click(screen.getByText("\u2715"));
        expect(screen.getByText("\u2630")).toBeInTheDocument();
    });

    it("calls logout on click", () => {
        const mockLogout = vi.fn();
        mockUseAuth.mockReturnValue({ user: { id: "1", email: "test@test.com", full_name: "Test", is_admin: false }, loading: false, logout: mockLogout });
        render(<AppLayout sidebar={null} toolbar={null} viewer={null} />);
        fireEvent.click(screen.getByText("logout"));
        expect(mockLogout).toHaveBeenCalled();
    });
});
