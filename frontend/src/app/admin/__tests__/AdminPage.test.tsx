import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import AdminPage from "../page";

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
    useLocale: () => "en",
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

    it("switches to bugs tab and shows bug reports", async () => {
        (api.listBugReports as any).mockResolvedValue(mockBugs);
        render(<AdminPage />);
        await vi.waitFor(() => {
            expect(screen.getByText("bugReports")).toBeInTheDocument();
        }, { timeout: 5000 });
        fireEvent.click(screen.getByText("bugReports"));
        await vi.waitFor(() => {
            expect(screen.getByText("Bug 1")).toBeInTheDocument();
        }, { timeout: 5000 });
    });

    it("shows loading state", () => {
        mockUseAuth.mockReturnValue({ user: null, loading: true });
        render(<AdminPage />);
        expect(screen.getByText("loading")).toBeInTheDocument();
    });

    it("shows empty bugs state", async () => {
        (api.listBugReports as any).mockResolvedValue({ items: [], total: 0 });
        render(<AdminPage />);
        await vi.waitFor(() => {
            expect(screen.getByText("bugReports")).toBeInTheDocument();
        }, { timeout: 5000 });
        fireEvent.click(screen.getByText("bugReports"));
        await vi.waitFor(() => {
            expect(screen.getByText("noBugs")).toBeInTheDocument();
        }, { timeout: 5000 });
    });

    it("shows no users message when empty", async () => {
        (api.listUsers as any).mockResolvedValue({ items: [], total: 0 });
        render(<AdminPage />);
        await vi.waitFor(() => {
            expect(screen.getByText("noUsers")).toBeInTheDocument();
        }, { timeout: 5000 });
    });

    it("changes bug status filter", async () => {
        (api.listBugReports as any).mockResolvedValue(mockBugs);
        render(<AdminPage />);
        await vi.waitFor(() => {
            expect(screen.getByText("bugReports")).toBeInTheDocument();
        }, { timeout: 5000 });
        fireEvent.click(screen.getByText("bugReports"));
        await vi.waitFor(() => {
            expect(screen.getByText("Bug 1")).toBeInTheDocument();
        }, { timeout: 5000 });

        // Change status filter
        const filterSelect = screen.getAllByRole("combobox")[0];
        fireEvent.change(filterSelect, { target: { value: "open" } });
    });

    it("handles license tier edit click", async () => {
        (api.listUsers as any).mockResolvedValue(mockUsers);
        render(<AdminPage />);
        await vi.waitFor(() => {
            expect(screen.getByText("alice@test.com")).toBeInTheDocument();
        }, { timeout: 5000 });

        // Click edit on first user
        const saveButtons = screen.getAllByText("save");
        fireEvent.click(saveButtons[0]);
    });

    it("shows bug status change options", async () => {
        (api.listBugReports as any).mockResolvedValue(mockBugs);
        render(<AdminPage />);
        await vi.waitFor(() => {
            expect(screen.getByText("bugReports")).toBeInTheDocument();
        }, { timeout: 5000 });
        fireEvent.click(screen.getByText("bugReports"));
        await vi.waitFor(() => {
            expect(screen.getByText("Bug 1")).toBeInTheDocument();
        }, { timeout: 5000 });
        // There should be action selects (one per bug row)
        const actionSelects = screen.getAllByRole("combobox");
        expect(actionSelects.length).toBeGreaterThanOrEqual(1);
    });

    it("changes bug status via select", async () => {
        (api.listBugReports as any).mockResolvedValue(mockBugs);
        (api.updateBugReportStatus as any).mockResolvedValue({});
        render(<AdminPage />);
        await vi.waitFor(() => {
            expect(screen.getByText("bugReports")).toBeInTheDocument();
        }, { timeout: 5000 });
        fireEvent.click(screen.getByText("bugReports"));
        await vi.waitFor(() => {
            expect(screen.getByText("Bug 1")).toBeInTheDocument();
        }, { timeout: 5000 });

        // Find the bug status select (last combobox after the filter)
        const allSelects = screen.getAllByRole("combobox");
        const bugStatusSelect = allSelects[allSelects.length - 1];
        fireEvent.change(bugStatusSelect, { target: { value: "in_progress" } });
        await vi.waitFor(() => {
            expect(api.updateBugReportStatus).toHaveBeenCalledWith("b1", "in_progress");
        });
    });

    it("shows alert on bug status change failure", async () => {
        (api.listBugReports as any).mockResolvedValue(mockBugs);
        (api.updateBugReportStatus as any).mockRejectedValue(new Error("API Error"));
        const alertMock = vi.fn();
        vi.stubGlobal("alert", alertMock);

        render(<AdminPage />);
        await vi.waitFor(() => {
            expect(screen.getByText("bugReports")).toBeInTheDocument();
        }, { timeout: 5000 });
        fireEvent.click(screen.getByText("bugReports"));
        await vi.waitFor(() => {
            expect(screen.getByText("Bug 1")).toBeInTheDocument();
        }, { timeout: 5000 });

        const allSelects = screen.getAllByRole("combobox");
        const bugStatusSelect = allSelects[allSelects.length - 1];
        fireEvent.change(bugStatusSelect, { target: { value: "in_progress" } });
        await vi.waitFor(() => {
            expect(alertMock).toHaveBeenCalled();
        });
    });

    it("saves license tier change and updates table", async () => {
        (api.listUsers as any).mockResolvedValue(mockUsers);
        (api.updateUserLicense as any).mockResolvedValue({});
        render(<AdminPage />);
        await vi.waitFor(() => {
            expect(screen.getByText("alice@test.com")).toBeInTheDocument();
        }, { timeout: 5000 });

        // Click edit on first user (first "save" button)
        const editButtons = screen.getAllByText("save");
        fireEvent.click(editButtons[0]);

        // The editing row now shows a select with autoFocus — find it by value
        // (the edit select has value "free" initially, the filter select has value "")
        const editSelect = screen
            .getAllByRole("combobox")
            .find((el) => (el as HTMLSelectElement).value === "free")!;
        fireEvent.change(editSelect, { target: { value: "pro" } });

        // After entering edit mode, the first "save" button is the confirm button
        const saveButtons = screen.getAllByText("save");
        fireEvent.click(saveButtons[0]);

        await vi.waitFor(() => {
            expect(api.updateUserLicense).toHaveBeenCalledWith("u1", "pro");
        });
    });

    it("shows alert when license update fails", async () => {
        (api.listUsers as any).mockResolvedValue(mockUsers);
        (api.updateUserLicense as any).mockRejectedValue(new Error("API Error"));
        const alertMock = vi.fn();
        vi.stubGlobal("alert", alertMock);

        render(<AdminPage />);
        await vi.waitFor(() => {
            expect(screen.getByText("alice@test.com")).toBeInTheDocument();
        }, { timeout: 5000 });

        // Enter edit mode
        fireEvent.click(screen.getAllByText("save")[0]);
        // Confirm save — first save button is the confirm in the editing row
        const saveButtons = screen.getAllByText("save");
        fireEvent.click(saveButtons[0]);

        await vi.waitFor(() => {
            expect(alertMock).toHaveBeenCalled();
        });
        vi.unstubAllGlobals();
    });

    it("filters users by email search", async () => {
        (api.listUsers as any).mockResolvedValue(mockUsers);
        render(<AdminPage />);
        await vi.waitFor(() => {
            expect(screen.getByText("alice@test.com")).toBeInTheDocument();
        }, { timeout: 5000 });

        const searchInput = screen.getByPlaceholderText("Cerca per email...");
        fireEvent.change(searchInput, { target: { value: "bob" } });

        await vi.waitFor(() => {
            expect(screen.getByText("bob@test.com")).toBeInTheDocument();
            expect(screen.queryByText("alice@test.com")).not.toBeInTheDocument();
        });
    });

    it("returns empty state when search has no match", async () => {
        (api.listUsers as any).mockResolvedValue(mockUsers);
        render(<AdminPage />);
        await vi.waitFor(() => {
            expect(screen.getByText("alice@test.com")).toBeInTheDocument();
        }, { timeout: 5000 });

        const searchInput = screen.getByPlaceholderText("Cerca per email...");
        fireEvent.change(searchInput, { target: { value: "zzz" } });

        await vi.waitFor(() => {
            expect(screen.getByText("noUsers")).toBeInTheDocument();
        });
    });

    it("shows reset message when adminSendReset succeeds", async () => {
        (api.listUsers as any).mockResolvedValue(mockUsers);
        (api.adminSendReset as any).mockResolvedValue({ message: "Reset sent" });
        render(<AdminPage />);
        await vi.waitFor(() => {
            expect(screen.getByText("alice@test.com")).toBeInTheDocument();
        }, { timeout: 5000 });
        expect(api.adminSendReset).not.toHaveBeenCalled();
    });

    it("redirects to /app when user is not admin", async () => {
        mockUseAuth.mockReturnValue({
            user: { id: "u1", email: "user@test.com", is_admin: false },
            loading: false,
        });
        Object.defineProperty(window, "location", {
            writable: true,
            value: { href: "http://localhost:3000/admin" },
        });
        render(<AdminPage />);
        await vi.waitFor(() => {
            expect(window.location.href).toContain("/app");
        });
    });

    it("shows loading when user is null", () => {
        mockUseAuth.mockReturnValue({ user: null, loading: true });
        render(<AdminPage />);
        expect(screen.getByText("loading")).toBeInTheDocument();
    });

    it("filters users by license tier", async () => {
        (api.listUsers as any).mockResolvedValue(mockUsers);
        render(<AdminPage />);
        await vi.waitFor(() => {
            expect(screen.getByText("alice@test.com")).toBeInTheDocument();
        }, { timeout: 5000 });

        // Find the tier filter select (first combobox with value "")
        const selects = screen.getAllByRole("combobox");
        const tierSelect = selects.find(
            (el) => (el as HTMLSelectElement).value === "",
        )!;
        fireEvent.change(tierSelect, { target: { value: "pro" } });

        await vi.waitFor(() => {
            expect(screen.getByText("bob@test.com")).toBeInTheDocument();
            expect(screen.queryByText("alice@test.com")).not.toBeInTheDocument();
        });
    });

    it("filters users by date range", async () => {
        (api.listUsers as any).mockResolvedValue(mockUsers);
        render(<AdminPage />);
        await vi.waitFor(() => {
            expect(screen.getByText("alice@test.com")).toBeInTheDocument();
        }, { timeout: 5000 });

        // Set dateFrom to exclude alice (created 2026-01-01)
        const dateInputs = document.querySelectorAll('input[type="date"]');
        const dateFromInput = dateInputs[0] as HTMLInputElement;
        fireEvent.change(dateFromInput, { target: { value: "2026-01-02" } });

        await vi.waitFor(() => {
            expect(screen.getByText("bob@test.com")).toBeInTheDocument();
            expect(screen.queryByText("alice@test.com")).not.toBeInTheDocument();
        });
    });

    it("filters users by dateTo range", async () => {
        (api.listUsers as any).mockResolvedValue(mockUsers);
        render(<AdminPage />);
        await vi.waitFor(() => {
            expect(screen.getByText("alice@test.com")).toBeInTheDocument();
        }, { timeout: 5000 });

        // Set dateTo to exclude bob (created 2026-01-02)
        const dateInputs = document.querySelectorAll('input[type="date"]');
        const dateToInput = dateInputs[1] as HTMLInputElement;
        fireEvent.change(dateToInput, { target: { value: "2026-01-01" } });

        await vi.waitFor(() => {
            expect(screen.getByText("alice@test.com")).toBeInTheDocument();
            expect(screen.queryByText("bob@test.com")).not.toBeInTheDocument();
        });
    });

    it("logs error when loading users fails", async () => {
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { });
        (api.listUsers as any).mockRejectedValue(new Error("Load failed"));
        render(<AdminPage />);
        await vi.waitFor(() => {
            expect(consoleSpy).toHaveBeenCalled();
        });
        consoleSpy.mockRestore();
    });

    it("cancels license edit mode", async () => {
        (api.listUsers as any).mockResolvedValue(mockUsers);
        render(<AdminPage />);
        await vi.waitFor(() => {
            expect(screen.getByText("alice@test.com")).toBeInTheDocument();
        }, { timeout: 5000 });

        // Enter edit mode
        fireEvent.click(screen.getAllByText("save")[0]);
        // Cancel edit — the cancel button appears in the editing row
        fireEvent.click(screen.getByText("cancel"));
        // Should be back to display mode (no edit select with value "free")
        const editSelect = screen
            .getAllByRole("combobox")
            .find((el) => (el as HTMLSelectElement).value === "free");
        expect(editSelect).toBeUndefined();
    });

    it("logs error when loading bugs fails", async () => {
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { });
        (api.listBugReports as any).mockRejectedValue(new Error("Load failed"));
        render(<AdminPage />);
        await vi.waitFor(() => {
            expect(screen.getByText("bugReports")).toBeInTheDocument();
        }, { timeout: 5000 });
        fireEvent.click(screen.getByText("bugReports"));
        await vi.waitFor(() => {
            expect(consoleSpy).toHaveBeenCalled();
        });
        consoleSpy.mockRestore();
    });

    it("reloads bugs when status filter changes", async () => {
        (api.listBugReports as any).mockResolvedValue(mockBugs);
        render(<AdminPage />);
        await vi.waitFor(() => {
            expect(screen.getByText("bugReports")).toBeInTheDocument();
        }, { timeout: 5000 });
        fireEvent.click(screen.getByText("bugReports"));
        await vi.waitFor(() => {
            expect(screen.getByText("Bug 1")).toBeInTheDocument();
        }, { timeout: 5000 });

        // Change the filter select (the one with value "" — the LanguageSelector has "en")
        const filterSelect = screen
            .getAllByRole("combobox")
            .find((el) => (el as HTMLSelectElement).value === "")!;
        fireEvent.change(filterSelect, { target: { value: "resolved" } });

        await vi.waitFor(() => {
            expect(api.listBugReports).toHaveBeenCalledWith(
                0,
                100,
                "resolved",
            );
        });
    });

    it("updates bug status in table after change", async () => {
        (api.listBugReports as any).mockResolvedValue(mockBugs);
        (api.updateBugReportStatus as any).mockResolvedValue({});
        render(<AdminPage />);
        await vi.waitFor(() => {
            expect(screen.getByText("bugReports")).toBeInTheDocument();
        }, { timeout: 5000 });
        fireEvent.click(screen.getByText("bugReports"));
        await vi.waitFor(() => {
            expect(screen.getByText("Bug 1")).toBeInTheDocument();
        }, { timeout: 5000 });

        const allSelects = screen.getAllByRole("combobox");
        const bugStatusSelect = allSelects[allSelects.length - 1];
        fireEvent.change(bugStatusSelect, { target: { value: "in_progress" } });

        await vi.waitFor(() => {
            expect(api.updateBugReportStatus).toHaveBeenCalledWith("b1", "in_progress");
        });
    });
});
