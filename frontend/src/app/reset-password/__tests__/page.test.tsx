import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
        (api.resetPassword as any).mockResolvedValue({ id: "1", email: "test@test.com" });
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
        (api.resetPassword as any).mockRejectedValue(new Error("Token expired"));
        render(<ResetPasswordPage />);
        const inputs = screen.getAllByPlaceholderText("\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022");
        fireEvent.change(inputs[0], { target: { value: "Password1" } });
        fireEvent.change(inputs[1], { target: { value: "Password1" } });
        fireEvent.click(screen.getByText("resetButton"));
        expect(await screen.findByText("Token expired")).toBeInTheDocument();
    });

    it("shows loading state when resetting", async () => {
        (api.resetPassword as any).mockImplementation(() => new Promise(() => {}));
        render(<ResetPasswordPage />);
        const inputs = screen.getAllByPlaceholderText("\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022");
        fireEvent.change(inputs[0], { target: { value: "Password1" } });
        fireEvent.change(inputs[1], { target: { value: "Password1" } });
        fireEvent.click(screen.getByText("resetButton"));
        expect(await screen.findByText("resetting")).toBeInTheDocument();
    });
});
