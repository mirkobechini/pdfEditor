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

// Mock tauri
vi.mock("../lib/tauri", () => ({
    isTauri: () => false,
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
});

describe("HomePage (root page)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseAuth.mockReturnValue({ user: null, loading: false });
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