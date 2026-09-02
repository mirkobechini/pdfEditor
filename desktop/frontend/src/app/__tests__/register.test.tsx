import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RegisterPage from "../register/page";

const mockPush = vi.fn();
const mockRegister = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush }),
}));

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => {
        const map: Record<string, string> = {
            registerTitle: "Crea il tuo account",
            passwordMismatch: "Le password non coincidono",
            passwordTooShort: "Password troppo corta",
            registerFailed: "Registrazione fallita",
        };
        return map[key] || key;
    },
}));

vi.mock("../../shared/error-map", () => ({ mapError: () => "auth.registerFailed" }));

vi.mock("../../shared/auth", () => ({
    useAuth: () => ({
        register: (...args: any[]) => mockRegister(...args),
        user: null,
        loading: false,
    }),
}));

vi.mock("../../components/PasswordInput", () => ({ default: ({ placeholder, onChange, value }: { placeholder: string; onChange: (v: string) => void; value: string }) => <input placeholder={placeholder} onChange={(e) => onChange(e.target.value)} value={value} /> }));

describe("RegisterPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders registration form", () => {
        render(<RegisterPage />);
        expect(screen.getByText("Crea il tuo account")).toBeInTheDocument();
    });

    it("renders name input", () => {
        render(<RegisterPage />);
        expect(screen.getByPlaceholderText("namePlaceholder")).toBeInTheDocument();
    });

    it("renders email input", () => {
        render(<RegisterPage />);
        expect(screen.getByPlaceholderText("emailPlaceholder")).toBeInTheDocument();
    });

    it("renders password inputs", () => {
        render(<RegisterPage />);
        expect(screen.getByPlaceholderText("passwordPlaceholder")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("confirmPasswordPlaceholder")).toBeInTheDocument();
    });

    it("renders register button", () => {
        render(<RegisterPage />);
        expect(screen.getByText("registerButton")).toBeInTheDocument();
    });

    it("renders login link", () => {
        render(<RegisterPage />);
        expect(screen.getByText("loginButton")).toBeInTheDocument();
    });

    it("shows error when passwords don't match", async () => {
        render(<RegisterPage />);
        fireEvent.change(screen.getByPlaceholderText("namePlaceholder"), { target: { value: "Test" } });
        fireEvent.change(screen.getByPlaceholderText("emailPlaceholder"), { target: { value: "test@test.com" } });
        fireEvent.change(screen.getByPlaceholderText("passwordPlaceholder"), { target: { value: "pass123" } });
        fireEvent.change(screen.getByPlaceholderText("confirmPasswordPlaceholder"), { target: { value: "pass456" } });
        fireEvent.click(screen.getByText("registerButton"));
        await waitFor(() => {
            expect(screen.getByText("Le password non coincidono")).toBeInTheDocument();
        });
    });

    it("shows error when password too short", async () => {
        render(<RegisterPage />);
        fireEvent.change(screen.getByPlaceholderText("namePlaceholder"), { target: { value: "Test" } });
        fireEvent.change(screen.getByPlaceholderText("emailPlaceholder"), { target: { value: "test@test.com" } });
        fireEvent.change(screen.getByPlaceholderText("passwordPlaceholder"), { target: { value: "ab" } });
        fireEvent.change(screen.getByPlaceholderText("confirmPasswordPlaceholder"), { target: { value: "ab" } });
        fireEvent.click(screen.getByText("registerButton"));
        await waitFor(() => {
            expect(screen.getByText("Password troppo corta")).toBeInTheDocument();
        });
    });

    it("calls register on valid submission", async () => {
        mockRegister.mockResolvedValueOnce(undefined);
        render(<RegisterPage />);
        fireEvent.change(screen.getByPlaceholderText("namePlaceholder"), { target: { value: "Test User" } });
        fireEvent.change(screen.getByPlaceholderText("emailPlaceholder"), { target: { value: "test@test.com" } });
        fireEvent.change(screen.getByPlaceholderText("passwordPlaceholder"), { target: { value: "pass123" } });
        fireEvent.change(screen.getByPlaceholderText("confirmPasswordPlaceholder"), { target: { value: "pass123" } });
        fireEvent.click(screen.getByText("registerButton"));
        await waitFor(() => {
            expect(mockRegister).toHaveBeenCalledWith("test@test.com", "pass123", "Test User");
        });
        expect(mockPush).toHaveBeenCalledWith("/app");
    });

    it("shows error on register failure", async () => {
        mockRegister.mockRejectedValueOnce(new Error("Registration failed"));
        render(<RegisterPage />);
        fireEvent.change(screen.getByPlaceholderText("namePlaceholder"), { target: { value: "Test" } });
        fireEvent.change(screen.getByPlaceholderText("emailPlaceholder"), { target: { value: "test@test.com" } });
        fireEvent.change(screen.getByPlaceholderText("passwordPlaceholder"), { target: { value: "pass123" } });
        fireEvent.change(screen.getByPlaceholderText("confirmPasswordPlaceholder"), { target: { value: "pass123" } });
        fireEvent.click(screen.getByText("registerButton"));
        await waitFor(() => {
            expect(screen.getByText("Registrazione fallita")).toBeInTheDocument();
        });
    });
});
