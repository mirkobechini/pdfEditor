import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import GoogleLoginButton from "../GoogleLoginButton";

vi.mock("../../lib/auth", () => ({
    useAuth: () => ({ googleLogin: vi.fn() }),
}));

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}));

describe("GoogleLoginButton", () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it("renders placeholder before mount", () => {
        render(<GoogleLoginButton />);
        expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
    });
});
