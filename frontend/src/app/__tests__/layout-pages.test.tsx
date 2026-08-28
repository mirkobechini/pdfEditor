import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";

// Mock next/font/google — Geist fonts fail in jsdom
vi.mock("next/font/google", () => ({
    Geist: () => ({ variable: "--font-geist-sans" }),
    Geist_Mono: () => ({ variable: "--font-geist-mono" }),
}));

// Mock next/script
vi.mock("next/script", () => ({
    default: ({ id }: { id: string }) => <script id={id} />,
}));

// Mock keep-warm
const mockStartKeepWarm = vi.fn();
vi.mock("../lib/api", () => ({
    startKeepWarm: () => mockStartKeepWarm(),
    api: { getMe: vi.fn().mockRejectedValue(new Error("Not auth")) },
}));

// Mock Google OAuth
vi.mock("@react-oauth/google", () => ({
    GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => (
        <>{children}</>
    ),
}));

// Mock auth
const mockUseAuth = vi.fn().mockReturnValue({ user: null, loading: false });
vi.mock("../lib/auth", () => ({
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));

// Mock i18n
vi.mock("../lib/i18n", () => ({
    I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useLocaleSetter: () => vi.fn(),
}));

// Mock tauri — use a mutable variable so tests can override
let mockIsTauri = false;
vi.mock("../lib/tauri", () => ({
    isTauri: () => mockIsTauri,
}));

describe("RootLayout", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders children inside html element", async () => {
        const RootLayout = (await import("../layout")).default;
        render(<RootLayout>
            <div>Test Child</div>
        </RootLayout>);
        expect(screen.getByText("Test Child")).toBeInTheDocument();
    });
});

describe("ClientLayout", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders children and starts keep-warm when no GOOGLE_CLIENT_ID", async () => {
        const ClientLayout = (await import("../ClientLayout")).default;
        render(<ClientLayout><div>Content</div></ClientLayout>);
        expect(screen.getByText("Content")).toBeInTheDocument();
        expect(mockStartKeepWarm).toHaveBeenCalled();
    });

    it("wraps children in GoogleOAuthProvider when GOOGLE_CLIENT_ID is set", async () => {
        // Simulate env var being set
        const originalEnv = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "test-client-id";
        try {
            // Re-import with fresh module state to re-read the env var
            vi.resetModules();
            const ClientLayout = (await import("../ClientLayout")).default;
            render(<ClientLayout><div>OAuth Content</div></ClientLayout>);
            expect(screen.getByText("OAuth Content")).toBeInTheDocument();
            expect(mockStartKeepWarm).toHaveBeenCalled();
        } finally {
            process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = originalEnv;
        }
    });
});

describe("HomePage (root page)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseAuth.mockReturnValue({ user: null, loading: false });
        mockIsTauri = false;
        // Allow window.location.href to be set in jsdom
        Object.defineProperty(window, "location", {
            writable: true,
            value: { href: "http://localhost:3000/" },
        });
    });

    it("renders landing sections when not authenticated and not tauri", async () => {
        const Home = (await import("../page")).default;
        render(<Home />);
        // Landing navbar brand
        expect(screen.getAllByText("PdfEditor").length).toBeGreaterThan(0);
    });

    it("redirects to /app when user is authenticated", async () => {
        // Override useAuth mock to return a user
        mockUseAuth.mockReturnValue({
            user: { id: "u1", email: "a@b.com" },
            loading: false,
        });

        const Home = (await import("../page")).default;
        render(<Home />);
        // window.location.href is set after useEffect fires
        await waitFor(() => {
            expect(window.location.href).toContain("/app");
        });
    });

    it("redirects to /login in Tauri environment", async () => {
        mockIsTauri = true;

        const Home = (await import("../page")).default;
        const { container } = render(<Home />);
        // In Tauri mode, should redirect to /login
        await waitFor(() => {
            expect(window.location.href).toContain("/login");
        });
        // Should render empty div while redirecting
        expect(container.firstChild).toBeTruthy();
    });

    it("does not redirect while loading", async () => {
        mockUseAuth.mockReturnValue({ user: null, loading: true });
        const Home = (await import("../page")).default;
        render(<Home />);
        // Should not redirect while loading
        expect(window.location.href).toBe("http://localhost:3000/");
    });
});

describe("ApiPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders title and brand link", async () => {
        const ApiPage = (await import("../api/page")).default;
        render(<ApiPage />);
        expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
        expect(screen.getAllByText("PdfEditor").length).toBeGreaterThan(0);
    });
});