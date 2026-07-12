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

const mockAdmin = {
    id: "admin1", email: "admin@test.com", full_name: "Admin",
    is_active: true, is_admin: true, license_tier: "admin",
    license_tier_source: "admin", created_at: "2026-01-01", updated_at: "2026-01-01",
};

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
    ],
    total: 1,
};

vi.mock("../../lib/api", () => ({
    api: {
        listUsers: vi.fn(),
        listBugReports: vi.fn(),
        updateBugReportStatus: vi.fn(),
        updateUserLicense: vi.fn(),
        adminSendReset: vi.fn(),
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

    it("renders users and bugs tabs", async () => {
        render(<AdminPage />);
        await vi.waitFor(() => {
            expect(screen.getByText("users")).toBeInTheDocument();
            expect(screen.getByText("bugReports")).toBeInTheDocument();
        }, { timeout: 5000 });
    });

    it("renders users table with data", async () => {
        (api.listUsers as any).mockResolvedValue(mockUsers);
        render(<AdminPage />);
        await vi.waitFor(() => {
            expect(screen.getByText("alice@test.com")).toBeInTheDocument();
        }, { timeout: 5000 });
    });
});
