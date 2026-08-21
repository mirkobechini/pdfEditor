import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockLogin = vi.fn();
const mockGuestLogin = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));
vi.mock("../../shared/auth", () => ({ useAuth: () => ({ user: null, loading: false, login: (...args: any[]) => mockLogin(...args), guestLogin: (...args: any[]) => mockGuestLogin(...args) }) }));
vi.mock("../../shared/tauri", () => ({ getApiBaseUrl: () => "http://127.0.0.1:7723" }));
vi.mock("../../components/PasswordInput", () => ({ default: ({ placeholder }: { placeholder: string }) => <input placeholder={placeholder} /> }));
vi.mock("../../components/GoogleLoginButton", () => ({ default: () => <div>GoogleLogin</div> }));

import LoginPage from "../login/page";

describe("LoginPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders without crashing", () => {
        const { container } = render(<LoginPage />);
        expect(container).toBeTruthy();
    });

    it("renders Google login button", () => {
        render(<LoginPage />);
        expect(screen.getByText("GoogleLogin")).toBeInTheDocument();
    });

    it("renders email input", () => {
        render(<LoginPage />);
        expect(screen.getByPlaceholderText("email@esempio.com")).toBeInTheDocument();
    });

    it("renders forgot password link", () => {
        render(<LoginPage />);
        expect(screen.getByText("Recupera password")).toBeInTheDocument();
    });

    it("renders guest login button", () => {
        render(<LoginPage />);
        expect(screen.getByText("continueAsGuest")).toBeInTheDocument();
    });

    it("shows backend starting indicator", () => {
        render(<LoginPage />);
        expect(screen.getByText(/Avvio del backend/)).toBeInTheDocument();
    });
});
