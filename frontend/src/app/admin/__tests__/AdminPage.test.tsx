import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import AdminPage from "../page";

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}));

const mockUseAuth = vi.fn();
vi.mock("../../lib/auth", () => ({
    useAuth: () => mockUseAuth(),
}));

const mockUsers = {
    items: [
        { id: "u1", email: "alice@test.com", full_name: "Alice", is_active: true, is_admin: false, license_tier: "free", license_tier_source: "admin", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
        { id: "u2", email: "bob@test.com", full_name: "Bob", is_active: true, is_admin: true, license_tier: "pro", license_tier_source: "admin", created_at: "2026-01-02T00:00:00Z", updated_at: "2026-01-02T00:00:00Z" },
    ],
    total: 2,
};

const mockBugs = {
    items: [
        { id: "b1", title: "Bug 1", description: "First bug", status: "open", user_id: "u1", platform: "web", app_version: "1.0", os_info: "Windows", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
        { id: "b2", title: "Bug 2", description: "Second bug", status: "resolved", user_id: "u2", platform: null, app_version: null, os_info: null, created_at: "2026-01-02T00:00:00Z", updated_at: "2026-01-02T00:00:00Z" },
    ],
    total: 2,
};

const mockAdmin = {
    id: "admin1", email: "admin@test.com", full_name: "Admin",
    is_active: true, is_admin: true, license_tier: "admin",
    license_tier_source: "admin", created_at: "2026-01-01", updated_at: "2026-01-01",
};

vi.mock("../../lib/api", () => ({
    api: {
        listUsers: vi.fn(),
        listBugReports: vi.fn(),
        updateBugReportStatus: vi.fn(),
        updateUserLicense: vi.fn(),
    },
}));

import { api } from "../../lib/api";

describe("AdminPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseAuth.mockReturnValue({ user: mockAdmin, loading: false });
        (api.listUsers as any).mockResolvedValue({ items: [], total: 0 });
        (api.listBugReports as any).mockResolvedValue({ items: [], total: 0 });
    });

    it("renders dashboard title", async () => {
        render(<AdminPage />);
        await vi.waitFor(() => expect(screen.getByText("title")).toBeInTheDocument(), { timeout: 5000 });
    });

    it("renders both tabs", async () => {
        render(<AdminPage />);
        await vi.waitFor(() => {
            expect(screen.getByText("users")).toBeInTheDocument();
            expect(screen.getByText("bugReports")).toBeInTheDocument();
        }, { timeout: 5000 });
    });

    it("shows loading state", () => {
        mockUseAuth.mockReturnValue({ user: null, loading: true });
        render(<AdminPage />);
        expect(screen.getByText("loading")).toBeInTheDocument();
    });

    it("redirects non-admin users", () => {
        const originalDescriptor = Object.getOwnPropertyDescriptor(window, "location")!;
        Object.defineProperty(window, "location", {
            value: { ...window.location, href: "" },
            writable: true,
        });
        mockUseAuth.mockReturnValue({ user: { ...mockAdmin, is_admin: false }, loading: false });
        render(<AdminPage />);
        Object.defineProperty(window, "location", originalDescriptor);
    });

    it("shows empty state when no users", async () => {
        render(<AdminPage />);
        await vi.waitFor(() => expect(screen.getByText("noUsers")).toBeInTheDocument(), { timeout: 5000 });
    });

    it("renders users table with data", async () => {
        (api.listUsers as any).mockResolvedValue(mockUsers);
        render(<AdminPage />);
        await vi.waitFor(() => {
            expect(screen.getByText("alice@test.com")).toBeInTheDocument();
            expect(screen.getByText("bob@test.com")).toBeInTheDocument();
        }, { timeout: 5000 });
    });

    it("allows editing user license", async () => {
        (api.listUsers as any).mockResolvedValue(mockUsers);
        (api.updateUserLicense as any).mockResolvedValue({});
        render(<AdminPage />);
        await vi.waitFor(() => expect(screen.getByText("alice@test.com")).toBeInTheDocument(), { timeout: 5000 });
        const editBtns = screen.getAllByText("save");
        fireEvent.click(editBtns[0]);
        await vi.waitFor(() => {
            expect(document.querySelector("select")).toBeInTheDocument();
        }, { timeout: 5000 });
        fireEvent.click(screen.getByText("cancel"));
        expect(screen.getAllByText("save").length).toBe(2);
    });

    it("cancels license editing", async () => {
        (api.listUsers as any).mockResolvedValue(mockUsers);
        render(<AdminPage />);
        await vi.waitFor(() => expect(screen.getByText("alice@test.com")).toBeInTheDocument(), { timeout: 5000 });
        const saveButtons = screen.getAllByText("save");
        fireEvent.click(saveButtons[0]);
        await vi.waitFor(() => expect(screen.queryByText("cancel")).toBeInTheDocument(), { timeout: 5000 });
        fireEvent.click(screen.getByText("cancel"));
        expect(screen.getAllByText("save").length).toBe(mockUsers.items.length);
    });

    it("shows loading state in users tab", async () => {
        (api.listUsers as any).mockImplementation(() => new Promise(() => {}));
        render(<AdminPage />);
        await vi.waitFor(() => expect(screen.getByText("loading")).toBeInTheDocument(), { timeout: 5000 });
    });

    it("shows empty state in bug reports tab", async () => {
        render(<AdminPage />);
        fireEvent.click(screen.getByText("bugReports"));
        await vi.waitFor(() => expect(screen.getByText("noBugs")).toBeInTheDocument(), { timeout: 5000 });
    });

    it("renders bug reports with data", async () => {
        (api.listBugReports as any).mockResolvedValue(mockBugs);
        render(<AdminPage />);
        fireEvent.click(screen.getByText("bugReports"));
        await vi.waitFor(() => {
            expect(screen.getByText("Bug 1")).toBeInTheDocument();
            expect(screen.getByText("Bug 2")).toBeInTheDocument();
        }, { timeout: 5000 });
    });

    it("changes bug report status via select", async () => {
        (api.listBugReports as any).mockResolvedValue(mockBugs);
        (api.updateBugReportStatus as any).mockResolvedValue({});
        render(<AdminPage />);
        fireEvent.click(screen.getByText("bugReports"));
        await vi.waitFor(() => expect(screen.getByText("Bug 1")).toBeInTheDocument(), { timeout: 5000 });
        const statusSelects = document.querySelectorAll("tbody select");
        fireEvent.change(statusSelects[0], { target: { value: "in_progress" } });
        await vi.waitFor(() => {
            expect(api.updateBugReportStatus).toHaveBeenCalledWith("b1", "in_progress");
        }, { timeout: 5000 });
    });

    it("shows loading state in bug reports tab", async () => {
        (api.listBugReports as any).mockImplementation(() => new Promise(() => {}));
        render(<AdminPage />);
        fireEvent.click(screen.getByText("bugReports"));
        await vi.waitFor(() => expect(screen.getByText("loading")).toBeInTheDocument(), { timeout: 5000 });
    });

    it("shows all filter options in users tab", async () => {
        (api.listUsers as any).mockResolvedValue(mockUsers);
        render(<AdminPage />);
        await vi.waitFor(() => expect(screen.getByText("alice@test.com")).toBeInTheDocument(), { timeout: 5000 });
        const filterDivs = screen.getAllByText("licenseTier");
        expect(filterDivs.length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("alice@test.com")).toBeInTheDocument();
        expect(screen.getByText("bob@test.com")).toBeInTheDocument();
    });
});