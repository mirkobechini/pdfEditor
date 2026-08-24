import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import LoginPage from "../page";

// ─── Mocks ────────────────────────────────────────────────────────

const mockLogin = vi.fn();
const mockGuestLogin = vi.fn();
let mockUser: any = null;
let mockLoading = false;

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => {
        const map: Record<string, string> = {
            heroTitle: "Modifica PDF in locale",
            heroDesc: "Descrizione hero",
            badgeOffline: "OFFLINE",
            badgeE2e: "E2E",
            badgeAgpl: "AGPL",
            backendStarting: "Avvio backend...",
            backendUnavailable: "Backend non disponibile",
            welcomeBack: "Bentornato",
            emailPlaceholder: "Inserisci email",
            passwordPlaceholder: "Inserisci password",
            forgotPassword: "Password dimenticata?",
            email: "Email",
            password: "Password",
            rememberMe: "Ricordami",
            loginButton: "Accedi",
            continueWithGoogle: "Continua con Google",
            continueAsGuest: "Continua come ospite",
            noAccount: "Non hai un account?",
            createAccount: "Crea account",
            freeTier: "gratuito",
            workspace: "Il tuo workspace PDF",
            or: "o",
            googleAuthFailed: "Google auth fallito",
            loading: "Caricamento...",
            version: "v1.0.0",
            license: "MIT",
            invalidCredentials: "Credenziali non valide",
        };
        return map[key] || key;
    },
}));

vi.mock("../../../shared/auth", () => ({
    useAuth: () => ({
        user: mockUser,
        loading: mockLoading,
        login: (...args: any[]) => mockLogin(...args),
        guestLogin: (...args: any[]) => mockGuestLogin(...args),
    }),
}));

vi.mock("../../../shared/error-map", () => ({
    mapError: (err: any) => err?.message || "auth.invalidCredentials",
}));

vi.mock("../../../shared/tauri", () => ({
    getApiBaseUrl: () => "http://127.0.0.1:7723",
    isTauri: () => false,
}));

vi.mock("../../../components/PasswordInput", () => ({
    default: ({ value, onChange, placeholder, required }: any) => (
        <input
            type="password"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            data-testid="password-input"
        />
    ),
}));

vi.mock("../../../components/GoogleLoginButton", () => ({
    default: ({ resetKey }: any) => (
        <div data-testid="google-login-button" data-reset-key={resetKey}>
            Google Login
        </div>
    ),
}));

// ─── Tests ────────────────────────────────────────────────────────

describe("LoginPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUser = null;
        mockLoading = false;
        // Mock window.location
        Object.defineProperty(window, "location", {
            value: { href: "" },
            writable: true,
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // ── Rendering ─────────────────────────────────────────────

    it("renders login form", () => {
        render(<LoginPage />);
        expect(screen.getByText("Il tuo workspace PDF")).toBeInTheDocument();
        expect(screen.getByText("Bentornato")).toBeInTheDocument();
        expect(screen.getByText("Accedi")).toBeInTheDocument();
    });

    it("renders hero section", () => {
        render(<LoginPage />);
        expect(screen.getByText("Modifica PDF in locale")).toBeInTheDocument();
        expect(screen.getByText("OFFLINE")).toBeInTheDocument();
        expect(screen.getByText("E2E")).toBeInTheDocument();
        expect(screen.getByText("AGPL")).toBeInTheDocument();
    });

    it("renders email and password fields", () => {
        render(<LoginPage />);
        expect(screen.getByPlaceholderText("Inserisci email")).toBeInTheDocument();
        expect(screen.getByTestId("password-input")).toBeInTheDocument();
    });

    it("renders Google login button", () => {
        render(<LoginPage />);
        expect(screen.getByTestId("google-login-button")).toBeInTheDocument();
    });

    it("renders guest login button", () => {
        render(<LoginPage />);
        expect(screen.getByText("Continua come ospite")).toBeInTheDocument();
    });

    it("renders register link", () => {
        render(<LoginPage />);
        const links = screen.getAllByText(/Crea account/);
        expect(links.length).toBeGreaterThanOrEqual(1);
    });

    it("renders forgot password link", () => {
        render(<LoginPage />);
        expect(screen.getByText("Password dimenticata?")).toBeInTheDocument();
    });

    it("renders version and license", () => {
        render(<LoginPage />);
        expect(screen.getByText(/v1\.0\.0/)).toBeInTheDocument();
        expect(screen.getByText(/MIT/)).toBeInTheDocument();
    });

    // ── Sidecar health ────────────────────────────────────────

    it("shows backend starting message while checking", () => {
        render(<LoginPage />);
        expect(screen.getByText("Avvio backend...")).toBeInTheDocument();
    });

    it("shows backend unavailable after failed health checks", async () => {
        vi.useFakeTimers();
        // Mock fetch to always fail
        const origFetch = globalThis.fetch;
        globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

        render(<LoginPage />);

        // Advance through all 90 retries (90 * 2000ms = 180s)
        for (let i = 0; i < 95; i++) {
            await act(async () => {
                vi.advanceTimersByTime(2000);
            });
        }

        expect(screen.getByText("Backend non disponibile")).toBeInTheDocument();
        globalThis.fetch = origFetch;
        vi.useRealTimers();
    });

    // ── Login form submission ─────────────────────────────────

    it("calls login on form submit", async () => {
        mockLogin.mockResolvedValue(undefined);
        render(<LoginPage />);
        fireEvent.change(screen.getByPlaceholderText("Inserisci email"), { target: { value: "test@test.com" } });
        fireEvent.change(screen.getByTestId("password-input"), { target: { value: "password123" } });
        fireEvent.click(screen.getByText("Accedi"));
        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith("test@test.com", "password123", true);
        });
    });

    it("shows error on login failure", async () => {
        mockLogin.mockRejectedValue(new Error("auth.invalidCredentials"));
        render(<LoginPage />);
        fireEvent.change(screen.getByPlaceholderText("Inserisci email"), { target: { value: "test@test.com" } });
        fireEvent.change(screen.getByTestId("password-input"), { target: { value: "wrong" } });
        fireEvent.click(screen.getByText("Accedi"));
        await waitFor(() => {
            expect(screen.getByText("Credenziali non valide")).toBeInTheDocument();
        });
    });

    it("does not submit with empty fields", () => {
        render(<LoginPage />);
        fireEvent.click(screen.getByText("Accedi"));
        expect(mockLogin).not.toHaveBeenCalled();
    });

    it("shows loading state on submit", async () => {
        mockLogin.mockImplementation(() => new Promise((r) => setTimeout(r, 1000)));
        render(<LoginPage />);
        fireEvent.change(screen.getByPlaceholderText("Inserisci email"), { target: { value: "test@test.com" } });
        fireEvent.change(screen.getByTestId("password-input"), { target: { value: "password123" } });
        fireEvent.click(screen.getByText("Accedi"));
        expect(screen.getByText("Caricamento...")).toBeInTheDocument();
    });

    // ── Guest login ───────────────────────────────────────────

    it("calls guestLogin on guest button click", async () => {
        mockGuestLogin.mockResolvedValue(undefined);
        render(<LoginPage />);
        fireEvent.click(screen.getByText("Continua come ospite"));
        await waitFor(() => {
            expect(mockGuestLogin).toHaveBeenCalled();
        });
    });

    it("shows error on guest login failure", async () => {
        mockGuestLogin.mockRejectedValue(new Error("auth.invalidCredentials"));
        render(<LoginPage />);
        fireEvent.click(screen.getByText("Continua come ospite"));
        await waitFor(() => {
            expect(screen.getByText("Credenziali non valide")).toBeInTheDocument();
        });
    });

    // ── Remember checkbox ─────────────────────────────────────

    it("toggles remember checkbox", () => {
        render(<LoginPage />);
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).toBeChecked();
        fireEvent.click(checkbox);
        expect(checkbox).not.toBeChecked();
    });

    // ── Redirect when logged in ───────────────────────────────

    it("redirects to /app when user is already logged in", () => {
        mockUser = { id: "u1", email: "test@test.com" };
        render(<LoginPage />);
        expect(window.location.href).toBe("/app");
    });

    it("shows empty div when user is logged in (before redirect)", () => {
        mockUser = { id: "u1", email: "test@test.com" };
        const { container } = render(<LoginPage />);
        // The component returns early with a div
        expect(container.querySelector(".h-screen")).toBeInTheDocument();
    });

    // ── Error display ─────────────────────────────────────────

    it("displays error message when present", async () => {
        mockLogin.mockRejectedValue(new Error("auth.invalidCredentials"));
        render(<LoginPage />);
        fireEvent.change(screen.getByPlaceholderText("Inserisci email"), { target: { value: "test@test.com" } });
        fireEvent.change(screen.getByTestId("password-input"), { target: { value: "wrong" } });
        fireEvent.click(screen.getByText("Accedi"));
        await waitFor(() => {
            expect(screen.getByText("Credenziali non valide")).toBeInTheDocument();
        });
    });

    // ── Google reset key ──────────────────────────────────────

    it("increments google reset key on login error", async () => {
        mockLogin.mockRejectedValue(new Error("auth.invalidCredentials"));
        render(<LoginPage />);
        const googleBtn = screen.getByTestId("google-login-button");
        const initialKey = googleBtn.getAttribute("data-reset-key");
        fireEvent.change(screen.getByPlaceholderText("Inserisci email"), { target: { value: "test@test.com" } });
        fireEvent.change(screen.getByTestId("password-input"), { target: { value: "wrong" } });
        fireEvent.click(screen.getByText("Accedi"));
        await waitFor(() => {
            const newKey = screen.getByTestId("google-login-button").getAttribute("data-reset-key");
            expect(newKey).not.toBe(initialKey);
        });
    });
});
