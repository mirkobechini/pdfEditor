import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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
        };
        return map[key] || key;
    },
}));

vi.mock("../../shared/auth", () => ({
    useAuth: () => ({
        register: (...args: any[]) => mockRegister(...args),
        user: null,
        loading: false,
    }),
}));

vi.mock("../../components/PasswordInput", () => ({
    default: ({ placeholder }: { placeholder: string }) => <input placeholder={placeholder} />,
}));

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
        expect(screen.getByPlaceholderText("Mario Rossi")).toBeInTheDocument();
    });

    it("renders email input", () => {
        render(<RegisterPage />);
        expect(screen.getByPlaceholderText("email@esempio.com")).toBeInTheDocument();
    });
});
