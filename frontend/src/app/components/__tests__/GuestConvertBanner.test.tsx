import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import GuestConvertBanner from "../GuestConvertBanner";

// Mock i18n
vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}));

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock("../../lib/auth", () => ({
    useAuth: () => mockUseAuth(),
}));

// Mock next/link to a plain <a> so href can be asserted
vi.mock("next/link", () => ({
    default: ({ href, children, className }: any) => (
        <a href={href} className={className}>
            {children}
        </a>
    ),
}));

describe("GuestConvertBanner", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders nothing for non-guest users", () => {
        mockUseAuth.mockReturnValue({
            user: { is_guest: false, email: "a@b.com" },
        });
        const { container } = render(<GuestConvertBanner />);
        expect(container.firstChild).toBeNull();
    });

    it("renders nothing when user is null", () => {
        mockUseAuth.mockReturnValue({ user: null });
        const { container } = render(<GuestConvertBanner />);
        expect(container.firstChild).toBeNull();
    });

    it("renders banner with description and convert link for guest users", () => {
        mockUseAuth.mockReturnValue({
            user: { is_guest: true, email: "guest@test.com" },
        });
        render(<GuestConvertBanner />);

        expect(screen.getByText("guestConvertDescription")).toBeTruthy();
        const link = screen.getByText("guestConvertTitle");
        expect(link.getAttribute("href")).toBe("/register?convert=1");
    });
});