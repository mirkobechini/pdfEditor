import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ProfilePage from "../profile/page";

const mockLogout = vi.fn();
const mockSetUser = vi.fn();
const mockUnlinkGoogle = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));

vi.mock("../../shared/api", () => ({
    api: {
        unlinkGoogle: (...args: any[]) => mockUnlinkGoogle(...args),
        deleteAccount: vi.fn(),
    },
}));

vi.mock("../../shared/auth", () => ({
    useAuth: () => ({
        user: { id: "u1", email: "test@test.com", full_name: "Test User", license_tier: "free", is_guest: false, is_active: true, google_id: "g123" },
        loading: false,
        logout: (...args: any[]) => mockLogout(...args),
        setUser: (...args: any[]) => mockSetUser(...args),
    }),
}));

describe("ProfilePage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders user email", () => {
        render(<ProfilePage />);
        expect(screen.getByText("test@test.com")).toBeInTheDocument();
    });

    it("renders user name", () => {
        render(<ProfilePage />);
        expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    it("renders Logout button", () => {
        render(<ProfilePage />);
        expect(screen.getByText("logout")).toBeInTheDocument();
    });

    it("renders Impostazioni link", () => {
        render(<ProfilePage />);
        expect(screen.getByText("settings")).toBeInTheDocument();
    });

    it("renders Editor link", () => {
        render(<ProfilePage />);
        expect(screen.getByText("editor")).toBeInTheDocument();
    });

    it("renders Servizi Collegati", () => {
        render(<ProfilePage />);
        expect(screen.getByText("connectedServices")).toBeInTheDocument();
    });

    it("renders Scollega button", () => {
        render(<ProfilePage />);
        expect(screen.getByText("unlink")).toBeInTheDocument();
    });

    it("renders Piano info", () => {
        render(<ProfilePage />);
        expect(screen.getByText("plan")).toBeInTheDocument();
    });
});