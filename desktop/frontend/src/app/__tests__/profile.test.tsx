import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ProfilePage from "../profile/page";

const mockLogout = vi.fn();
const mockSetUser = vi.fn();
const mockUnlinkGoogle = vi.fn();
const mockDeleteAccount = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush }),
}));

vi.mock("../../shared/api", () => ({
    api: {
        unlinkGoogle: (...args: any[]) => mockUnlinkGoogle(...args),
        deleteAccount: (...args: any[]) => mockDeleteAccount(...args),
    },
}));

vi.mock("../../shared/auth", () => ({
    useAuth: () => ({
        user: { id: "u1", email: "test@test.com", full_name: "Test User" },
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
        expect(screen.getByText("Logout")).toBeInTheDocument();
    });

    it("renders settings link", () => {
        render(<ProfilePage />);
        expect(screen.getByText("Impostazioni")).toBeInTheDocument();
    });

    it("renders editor link", () => {
        render(<ProfilePage />);
        expect(screen.getByText("Editor")).toBeInTheDocument();
    });
});