import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import React from "react";

vi.mock("next/navigation", () => ({
    useSearchParams: () => new URLSearchParams("token=test-token"),
    useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("../../lib/api", () => ({
    api: { resetPassword: vi.fn() },
}));

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
    useLocale: () => "en",
}));

const mockUseAuth = vi.fn();
vi.mock("../../lib/auth", () => ({
    useAuth: () => mockUseAuth(),
}));

import ResetPasswordPage from "../page";
import { api } from "../../lib/api";

const mockLogin = vi.fn();

describe("ResetPasswordPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseAuth.mockReturnValue({ user: null, loading: false, login: mockLogin });
    });

    it("renders the form with token", () => {
        render(<ResetPasswordPage />);
        expect(screen.getByText("resetTitle")).toBeInTheDocument();
        expect(screen.getByText("newPassword")).toBeInTheDocument();
        expect(screen.getByText("confirmPassword")).toBeInTheDocument();
    });

    it("shows error when passwords don't match", async () => {
        render(<ResetPasswordPage />);
        const inputs = screen.getAllByPlaceholderText("\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022");
        fireEvent.change(inputs[0], { target: { value: "Password1" } });
        fireEvent.change(inputs[1], { target: { value: "Password2" } });
        fireEvent.click(screen.getByText("resetButton"));
        expect(await screen.findByText("passwordMismatch")).toBeInTheDocument();
    });

    it("shows error when password too short (<6)", async () => {
        render(<ResetPasswordPage />);
        const inputs = screen.getAllByPlaceholderText("\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022");
        fireEvent.change(inputs[0], { target: { value: "Ab1" } });
        fireEvent.change(inputs[1], { target: { value: "Ab1" } });
        fireEvent.click(screen.getByText("resetButton"));
        expect(await screen.findByText("passwordTooShort")).toBeInTheDocument();
    });

    it("calls resetPassword and auto-login on success", async () => {
        vi.mocked(api.resetPassword).mockResolvedValue({ id: "1", email: "test@test.com", full_name: "Test", is_active: true, is_admin: false, license_tier: "free", license_tier_source: "admin", google_id: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" });
        mockLogin.mockResolvedValue(undefined);
        render(<ResetPasswordPage />);
        const inputs = screen.getAllByPlaceholderText("\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022");
        fireEvent.change(inputs[0], { target: { value: "Password1" } });
        fireEvent.change(inputs[1], { target: { value: "Password1" } });
        fireEvent.click(screen.getByText("resetButton"));
        await vi.waitFor(() => {
            expect(api.resetPassword).toHaveBeenCalledWith("test-token", "Password1");
        });
    });

    it("shows error message on API failure", async () => {
        vi.mocked(api.resetPassword).mockRejectedValue(new Error("Token expired"));
        render(<ResetPasswordPage />);
        const inputs = screen.getAllByPlaceholderText("\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022");
        fireEvent.change(inputs[0], { target: { value: "Password1" } });
        fireEvent.change(inputs[1], { target: { value: "Password1" } });
        fireEvent.click(screen.getByText("resetButton"));
        expect(await screen.findByText("Token expired")).toBeInTheDocument();
    });

    it("shows loading state when resetting", async () => {
        vi.mocked(api.resetPassword).mockImplementation(() => new Promise(() => { }));
        render(<ResetPasswordPage />);
        const inputs = screen.getAllByPlaceholderText("\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022");
        fireEvent.change(inputs[0], { target: { value: "Password1" } });
        fireEvent.change(inputs[1], { target: { value: "Password1" } });
        fireEvent.click(screen.getByText("resetButton"));
        expect(await screen.findByText("resetting")).toBeInTheDocument();
    });
});
