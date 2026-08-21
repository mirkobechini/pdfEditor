import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RegisterPage from "../register/page";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      registerTitle: "Crea il tuo account",
      fullNameLabel: "Nome completo",
      emailLabel: "Email",
      passwordLabel: "Password",
      confirmPasswordLabel: "Conferma password",
      alreadyHaveAccount: "Hai già un account?",
    };
    return map[key] || key;
  },
}));

vi.mock("../../shared/auth", () => ({
  useAuth: () => ({
    register: vi.fn(),
    user: null,
    loading: false,
  }),
}));

vi.mock("../../components/PasswordInput", () => ({
  default: ({ placeholder }: { placeholder: string }) => <input placeholder={placeholder} />,
}));

describe("RegisterPage", () => {
  it("renders registration form", () => {
    render(<RegisterPage />);
    expect(screen.getByText("Crea il tuo account")).toBeInTheDocument();
  });
});
