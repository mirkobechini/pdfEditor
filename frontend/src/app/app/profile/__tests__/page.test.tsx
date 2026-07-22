import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import ProfilePage from "../page";

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}));

vi.mock("../../../lib/auth", () => ({
    useAuth: vi.fn(),
}));

vi.mock("../../../lib/api", () => ({
    api: {
        updateProfile: vi.fn(),
        listMyBugReports: vi.fn(),
    },
}));

import { useAuth } from "../../../lib/auth";
import { api } from "../../../lib/api";

const mockUser = {
    id: "1",
    email: "test@example.com",
    full_name: "Test User",
    is_active: true,
    is_admin: false,
    license_tier: "free",
    license_tier_source: "admin",
    google_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
};

const mockBugs = [
    { id: "b1", title: "Bug 1", description: "First bug", status: "open", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", user_id: "1" },
    { id: "b2", title: "Bug 2", description: "Resolved bug", status: "resolved", created_at: "2026-01-02T00:00:00Z", updated_at: "2026-01-02T00:00:00Z", user_id: "1" },
];

describe("ProfilePage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (api.listMyBugReports as any).mockResolvedValue([]);
    });

    it("shows loading state", () => {
        (useAuth as any).mockReturnValue({ user: null, loading: true });
        render(<ProfilePage />);
        expect(screen.getByText("loading")).toBeInTheDocument();
    });

    it("renders user info", async () => {
        (useAuth as any).mockReturnValue({ user: mockUser, loading: false, setUser: vi.fn() });
        render(<ProfilePage />);
        expect(screen.getByDisplayValue("Test User")).toBeInTheDocument();
        expect(screen.getByDisplayValue("test@example.com")).toBeInTheDocument();
        expect(screen.getByText("FREE")).toBeInTheDocument();
    });

    it("updates name on save", async () => {
        const setUser = vi.fn();
        (useAuth as any).mockReturnValue({ user: mockUser, loading: false, setUser });
        (api.updateProfile as any).mockResolvedValue({ full_name: "New Name" });

        render(<ProfilePage />);
        const input = screen.getByDisplayValue("Test User");
        fireEvent.change(input, { target: { value: "New Name" } });
        fireEvent.click(screen.getByText("save"));

        await waitFor(() => {
            expect(api.updateProfile).toHaveBeenCalledWith({ full_name: "New Name" });
        });
    });

    it("redirects when not authenticated", () => {
        const originalLocation = window.location;
        delete (window as any).location;
        (window as any).location = { href: "" };

        (useAuth as any).mockReturnValue({ user: null, loading: false });
        render(<ProfilePage />);

        expect(window.location.href).toBe("/login");
    });

    it("shows bug reports section", async () => {
        (useAuth as any).mockReturnValue({ user: mockUser, loading: false, setUser: vi.fn() });
        (api.listMyBugReports as any).mockResolvedValue(mockBugs);
        render(<ProfilePage />);
        await waitFor(() => {
            expect(screen.getByText("myBugReports")).toBeInTheDocument();
            expect(screen.getByText("Bug 1")).toBeInTheDocument();
            expect(screen.getByText("Bug 2")).toBeInTheDocument();
            expect(screen.getByText("First bug")).toBeInTheDocument();
            expect(screen.getByText("open")).toBeInTheDocument();
            expect(screen.getByText("resolved")).toBeInTheDocument();
        });
    });

    it("shows empty state when no bug reports", async () => {
        (useAuth as any).mockReturnValue({ user: mockUser, loading: false, setUser: vi.fn() });
        (api.listMyBugReports as any).mockResolvedValue([]);
        render(<ProfilePage />);
        await waitFor(() => {
            expect(screen.getByText("noBugs")).toBeInTheDocument();
        });
    });
});