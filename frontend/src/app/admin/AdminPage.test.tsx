import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminPage from "./page";
import { api } from "../lib/api";

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    })),
});

// Mock next/link
vi.mock("next/link", () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

// Mock i18n
vi.mock("../lib/i18n", () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: "it" as const,
        setLocale: vi.fn(),
    }),
}));

// Mock auth
vi.mock("../lib/auth", () => ({
    useAuth: () => ({
        user: { id: "1", email: "admin@test.com", full_name: "Admin", is_admin: true, license_tier: "admin", is_active: true },
        loading: false,
        logout: vi.fn(),
        login: vi.fn(),
        register: vi.fn(),
    }),
}));

// Mock api
vi.mock("../lib/api", () => ({
    api: {
        listUsers: vi.fn(),
        updateUserLicense: vi.fn(),
        listBugReports: vi.fn(),
        updateBugReportStatus: vi.fn(),
    },
    AdminUser: {},
    BugReport: {},
}));

describe("AdminPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders admin dashboard title", () => {
        (api.listUsers as any).mockImplementation(() => new Promise(() => { }));

        render(<AdminPage />);

        expect(screen.getByText("admin.title")).toBeInTheDocument();
    });

    it("renders both tabs", () => {
        (api.listUsers as any).mockImplementation(() => new Promise(() => { }));

        render(<AdminPage />);

        expect(screen.getByText("admin.users")).toBeInTheDocument();
        expect(screen.getByText("admin.bugReports")).toBeInTheDocument();
    });

    it("shows users tab by default", () => {
        (api.listUsers as any).mockImplementation(() => new Promise(() => { }));

        render(<AdminPage />);

        // Users tab should have active styling
        const usersTab = screen.getByText("admin.users");
        expect(usersTab.className).toContain("border-blue-500");
    });

    it("shows loading state", () => {
        (api.listUsers as any).mockImplementation(() => new Promise(() => { }));

        render(<AdminPage />);

        expect(screen.getByText("admin.loading")).toBeInTheDocument();
    });

    it("has back to app link", () => {
        (api.listUsers as any).mockImplementation(() => new Promise(() => { }));

        render(<AdminPage />);

        expect(screen.getByText("admin.backToApp")).toBeInTheDocument();
    });

    it("renders users table when data loads", async () => {
        (api.listUsers as any).mockResolvedValue({
            items: [
                { id: "1", email: "user1@test.com", full_name: "User 1", license_tier: "free", is_admin: false, is_active: true, created_at: "2024-01-01", updated_at: "2024-01-01" },
                { id: "2", email: "admin@test.com", full_name: "Admin", license_tier: "admin", is_admin: true, is_active: true, created_at: "2024-01-01", updated_at: "2024-01-01" },
            ],
            total: 2,
        });

        render(<AdminPage />);

        expect(await screen.findByText("user1@test.com")).toBeInTheDocument();
        expect(await screen.findByText("admin@test.com")).toBeInTheDocument();
    });
});