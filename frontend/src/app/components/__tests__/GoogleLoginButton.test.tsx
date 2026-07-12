import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import GoogleLoginButton from "../GoogleLoginButton";

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}));

const mockGoogleLogin = vi.fn();
vi.mock("../../lib/auth", () => ({
    useAuth: () => ({ googleLogin: mockGoogleLogin }),
}));

describe("GoogleLoginButton", () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it("renders skeleton placeholder (Google not loaded)", () => {
        render(<GoogleLoginButton />);
        const skeleton = document.querySelector(".animate-pulse");
        expect(skeleton).toBeInTheDocument();
    });
});
