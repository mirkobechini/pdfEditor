import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import ProfilePage from "../page";

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
    useLocale: () => "en",
}));

vi.mock("../../../lib/auth", () => ({
    useAuth: vi.fn(),
}));

vi.mock("../../../lib/api", () => ({
    api: {
        updateProfile: vi.fn(),
        listMyBugReports: vi.fn(),
        unlinkGoogle: vi.fn(),
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

    it("does not save name when empty", () => {
        (useAuth as any).mockReturnValue({ user: mockUser, loading: false, setUser: vi.fn() });
        render(<ProfilePage />);
        const input = screen.getByDisplayValue("Test User");
        fireEvent.change(input, { target: { value: "   " } });
        fireEvent.click(screen.getByText("save"));
        expect(api.updateProfile).not.toHaveBeenCalled();
    });

    it("does not save name when unchanged", () => {
        (useAuth as any).mockReturnValue({ user: mockUser, loading: false, setUser: vi.fn() });
        render(<ProfilePage />);
        fireEvent.click(screen.getByText("save"));
        expect(api.updateProfile).not.toHaveBeenCalled();
    });

    it("shows error message when name save fails", async () => {
        (useAuth as any).mockReturnValue({ user: mockUser, loading: false, setUser: vi.fn() });
        (api.updateProfile as any).mockRejectedValue(new Error("Save failed"));
        render(<ProfilePage />);
        const input = screen.getByDisplayValue("Test User");
        fireEvent.change(input, { target: { value: "New Name" } });
        fireEvent.click(screen.getByText("save"));
        await waitFor(() => {
            expect(screen.getByText("error")).toBeInTheDocument();
        });
    });

    it("shows Google not linked for user without google_id", () => {
        (useAuth as any).mockReturnValue({ user: mockUser, loading: false, setUser: vi.fn() });
        render(<ProfilePage />);
        expect(screen.getByText("googleNotLinked")).toBeInTheDocument();
    });

    it("shows unlink button for user with google_id", () => {
        const googleUser = { ...mockUser, google_id: "g123" };
        (useAuth as any).mockReturnValue({ user: googleUser, loading: false, setUser: vi.fn() });
        render(<ProfilePage />);
        expect(screen.getByText("googleLinked")).toBeInTheDocument();
        fireEvent.click(screen.getByText("unlink"));
        expect(screen.getByText("unlinkGoogleTitle")).toBeInTheDocument();
    });

    it("unlinks Google account successfully", async () => {
        const setUser = vi.fn();
        const googleUser = { ...mockUser, google_id: "g123" };
        (useAuth as any).mockReturnValue({ user: googleUser, loading: false, setUser });
        (api.unlinkGoogle as any).mockResolvedValue({ ...mockUser, google_id: null });
        render(<ProfilePage />);
        fireEvent.click(screen.getByText("unlink"));
        const passwordInput = screen.getByPlaceholderText("enterPassword");
        fireEvent.change(passwordInput, { target: { value: "secret" } });
        fireEvent.click(screen.getByText("confirmUnlink"));
        await waitFor(() => {
            expect(api.unlinkGoogle).toHaveBeenCalledWith("secret");
            expect(setUser).toHaveBeenCalled();
        });
    });

    it("shows error when unlink fails", async () => {
        const googleUser = { ...mockUser, google_id: "g123" };
        (useAuth as any).mockReturnValue({ user: googleUser, loading: false, setUser: vi.fn() });
        (api.unlinkGoogle as any).mockRejectedValue(new Error("Wrong password"));
        render(<ProfilePage />);
        fireEvent.click(screen.getByText("unlink"));
        const passwordInput = screen.getByPlaceholderText("enterPassword");
        fireEvent.change(passwordInput, { target: { value: "bad" } });
        fireEvent.click(screen.getByText("confirmUnlink"));
        await waitFor(() => {
            expect(screen.getByText("Wrong password")).toBeInTheDocument();
        });
    });

    it("cancels unlink modal", () => {
        const googleUser = { ...mockUser, google_id: "g123" };
        (useAuth as any).mockReturnValue({ user: googleUser, loading: false, setUser: vi.fn() });
        render(<ProfilePage />);
        fireEvent.click(screen.getByText("unlink"));
        expect(screen.getByText("unlinkGoogleTitle")).toBeInTheDocument();
        fireEvent.click(screen.getByText("cancel"));
        expect(screen.queryByText("unlinkGoogleTitle")).not.toBeInTheDocument();
    });
});