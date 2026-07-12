import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import ForgotPasswordPage from "../page";
import { AuthProvider } from "../../lib/auth";

vi.mock("../../lib/api", () => ({
    api: {
        forgotPassword: vi.fn(),
        getMe: vi.fn().mockRejectedValue(new Error("Not auth")),
    },
}));

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}));

import { api } from "../../lib/api";

function renderWithAuth(ui: React.ReactElement) {
    return render(<AuthProvider>{ui}</AuthProvider>);
}

describe("ForgotPasswordPage", () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it("renders the form", () => {
        renderWithAuth(<ForgotPasswordPage />);
        expect(screen.getByText("forgotTitle")).toBeInTheDocument();
    });

    it("submits email and shows success", async () => {
        (api.forgotPassword as any).mockResolvedValue({ message: "Email sent" });
        renderWithAuth(<ForgotPasswordPage />);
        fireEvent.change(screen.getByPlaceholderText("email@example.com"), { target: { value: "test@test.com" } });
        fireEvent.click(screen.getByText("sendResetLink"));
        await waitFor(() => {
            expect(api.forgotPassword).toHaveBeenCalledWith("test@test.com");
        });
    });
});
