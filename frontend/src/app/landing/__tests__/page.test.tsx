import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import LandingPage from "../page";
import { AuthProvider } from "../../lib/auth";

vi.mock("../../lib/api", () => ({
    api: { getMe: vi.fn().mockRejectedValue(new Error("Not auth")) },
}));

function renderWithAuth(ui: React.ReactElement) {
    return render(<AuthProvider>{ui}</AuthProvider>);
}

describe("LandingPage", () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it("renders landing page with PdfEditor brand", () => {
        renderWithAuth(<LandingPage />);
        expect(screen.getAllByText("PdfEditor")[0]).toBeInTheDocument();
    });
});
