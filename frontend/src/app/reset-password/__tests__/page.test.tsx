import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import ResetPasswordPage from "../page";
import { AuthProvider } from "../../lib/auth";

// Mock next/navigation
vi.mock("next/navigation", () => ({
    useSearchParams: () => new URLSearchParams("token=test-token"),
    useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("../../lib/api", () => ({
    api: {
        resetPassword: vi.fn(),
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

describe("ResetPasswordPage", () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it("renders the form", () => {
        renderWithAuth(<ResetPasswordPage />);
        expect(screen.getByText("resetTitle")).toBeInTheDocument();
    });
});
