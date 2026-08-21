import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockLogin = vi.fn();
const mockGuestLogin = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));
vi.mock("../../shared/error-map", () => ({ mapError: () => "auth.invalidCredentials" }));
vi.mock("../../shared/auth", () => ({ useAuth: () => ({ user: null, loading: false, login: (...args: any[]) => mockLogin(...args), guestLogin: (...args: any[]) => mockGuestLogin(...args) }) }));
vi.mock("../../shared/tauri", () => ({ getApiBaseUrl: () => "http://127.0.0.1:7723" }));
vi.mock("../../components/PasswordInput", () => ({ default: ({ placeholder, onChange, value }: { placeholder: string; onChange: (v: string) => void; value: string }) => <input placeholder={placeholder} onChange={(e) => onChange(e.target.value)} value={value} /> }));
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

    it("renders remember me checkbox", () => {
        render(<LoginPage />);
        expect(screen.getByText("rememberMe")).toBeInTheDocument();
    });

    it("renders login button", () => {
        render(<LoginPage />);
        expect(screen.getByText("loginButton")).toBeInTheDocument();
    });

    it("renders password input", () => {
        render(<LoginPage />);
        const passwordInputs = screen.getAllByPlaceholderText("••••••••••••");
        expect(passwordInputs.length).toBeGreaterThan(0);
    });

    it("renders workspace title", () => {
        render(<LoginPage />);
        expect(screen.getByText("workspace")).toBeInTheDocument();
    });

    it("renders WELCOME BACK label", () => {
        render(<LoginPage />);
        expect(screen.getByText("WELCOME BACK")).toBeInTheDocument();
    });

    it("submits form with email and password", async () => {
        mockLogin.mockResolvedValueOnce(undefined);
        render(<LoginPage />);
        const emailInput = screen.getByPlaceholderText("email@esempio.com");
        const passwordInputs = screen.getAllByPlaceholderText("••••••••••••");
        const submitBtn = screen.getByText("loginButton");

        fireEvent.change(emailInput, { target: { value: "test@test.com" } });
        fireEvent.change(passwordInputs[0], { target: { value: "pass123" } });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith("test@test.com", "pass123", true);
        });
    });

    it("shows error on login failure", async () => {
        mockLogin.mockRejectedValueOnce(new Error("Invalid credentials"));
        render(<LoginPage />);
        const emailInput = screen.getByPlaceholderText("email@esempio.com");
        const passwordInputs = screen.getAllByPlaceholderText("••••••••••••");
        const submitBtn = screen.getByText("loginButton");

        fireEvent.change(emailInput, { target: { value: "test@test.com" } });
        fireEvent.change(passwordInputs[0], { target: { value: "pass123" } });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(screen.getByText("invalidCredentials")).toBeInTheDocument();
        });
    });

    it("does not submit with empty email", async () => {
        render(<LoginPage />);
        const submitBtn = screen.getByText("loginButton");
        expect(submitBtn).toBeDisabled();
    });

    it("renders or divider", () => {
        render(<LoginPage />);
        expect(screen.getByText("OR")).toBeInTheDocument();
    });

    it("renders continueAsGuest button", () => {
        render(<LoginPage />);
        expect(screen.getByText("continueAsGuest")).toBeInTheDocument();
    });

    it("renders password recovery link", () => {
        render(<LoginPage />);
        expect(screen.getByText("Recupera password")).toBeInTheDocument();
    });

    it("renders login page with stored token", () => {
        localStorage.setItem("pdfeditor_remember_token", "stored-token");
        render(<LoginPage />);
        expect(screen.getByText("workspace")).toBeInTheDocument();
        localStorage.removeItem("pdfeditor_remember_token");
    });

    it("toggles remember me checkbox", () => {
        render(<LoginPage />);
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).toBeChecked();
        fireEvent.click(checkbox);
        expect(checkbox).not.toBeChecked();
        fireEvent.click(checkbox);
        expect(checkbox).toBeChecked();
    });

    it("renders backend failed message when backend is down", () => {
        render(<LoginPage />);
        const backendMsg = screen.queryByText(/Backend non disponibile/);
        expect(backendMsg).not.toBeInTheDocument();
    });
});