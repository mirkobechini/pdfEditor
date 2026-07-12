import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import AdminPage from "../page";
import { AuthProvider } from "../../lib/auth";

vi.mock("../../lib/api", () => ({
    api: {
        getMe: vi.fn().mockResolvedValue({ id: "1", email: "admin@test.com", full_name: "Admin", is_active: true, is_admin: true, license_tier: "admin", license_tier_source: "admin", created_at: "2026-01-01", updated_at: "2026-01-01" }),
        listUsers: vi.fn().mockResolvedValue({ items: [], total: 0 }),
        listBugReports: vi.fn().mockResolvedValue({ items: [], total: 0 }),
        updateBugReportStatus: vi.fn(),
    },
}));

function renderWithAuth(ui: React.ReactElement) {
    return render(<AuthProvider>{ui}</AuthProvider>);
}

describe("AdminPage", () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it("renders dashboard title", async () => {
        renderWithAuth(<AdminPage />);
        await waitFor(() => {
            expect(screen.getByText("title")).toBeInTheDocument();
        });
    });

    it("renders both tabs", async () => {
        renderWithAuth(<AdminPage />);
        await waitFor(() => {
            expect(screen.getByText("users")).toBeInTheDocument();
            expect(screen.getByText("bugReports")).toBeInTheDocument();
        });
    });
});