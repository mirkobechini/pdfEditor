import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

    it("renders Settings link", () => {
        render(<ProfilePage />);
        expect(screen.getByText("settings")).toBeInTheDocument();
    });

    it("renders Editor link", () => {
        render(<ProfilePage />);
        expect(screen.getByText("editor")).toBeInTheDocument();
    });

    it("renders connected services section", () => {
        render(<ProfilePage />);
        expect(screen.getByText("connectedServices")).toBeInTheDocument();
    });

    it("renders unlink button when google_id exists", () => {
        render(<ProfilePage />);
        expect(screen.getByText("unlink")).toBeInTheDocument();
    });

    it("renders plan info", () => {
        render(<ProfilePage />);
        expect(screen.getByText("plan")).toBeInTheDocument();
    });

    it("shows account type for registered", () => {
        render(<ProfilePage />);
        expect(screen.getByText("registered")).toBeInTheDocument();
    });

    it("shows active status", () => {
        render(<ProfilePage />);
        expect(screen.getByText("active")).toBeInTheDocument();
    });

    it("opens unlink modal on unlink click", () => {
        render(<ProfilePage />);
        fireEvent.click(screen.getByText("unlink"));
        expect(screen.getByText("unlinkGoogle")).toBeInTheDocument();
        expect(screen.getByText("unlinkGoogleDesc")).toBeInTheDocument();
    });

    it("closes unlink modal on cancel", () => {
        render(<ProfilePage />);
        fireEvent.click(screen.getByText("unlink"));
        expect(screen.getByText("unlinkGoogle")).toBeInTheDocument();
        fireEvent.click(screen.getByText("cancel"));
        expect(screen.queryByText("unlinkGoogle")).not.toBeInTheDocument();
    });

    it("calls unlinkGoogle on confirm", async () => {
        mockUnlinkGoogle.mockResolvedValue({ google_id: null });
        render(<ProfilePage />);
        fireEvent.click(screen.getByText("unlink"));
        const input = screen.getByPlaceholderText("password");
        fireEvent.change(input, { target: { value: "mypass" } });
        fireEvent.click(screen.getByText("confirm"));
        await waitFor(() => {
            expect(mockUnlinkGoogle).toHaveBeenCalledWith("mypass");
        });
    });

    it("shows error on unlink failure", async () => {
        mockUnlinkGoogle.mockRejectedValue(new Error("Failed to unlink"));
        render(<ProfilePage />);
        fireEvent.click(screen.getByText("unlink"));
        const input = screen.getByPlaceholderText("password");
        fireEvent.change(input, { target: { value: "mypass" } });
        fireEvent.click(screen.getByText("confirm"));
        await waitFor(() => {
            expect(screen.getByText("Failed to unlink")).toBeInTheDocument();
        });
    });
});