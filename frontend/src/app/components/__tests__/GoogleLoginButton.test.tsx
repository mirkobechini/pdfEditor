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

// Mock @react-oauth/google BEFORE the component import
vi.mock("@react-oauth/google", () => ({
    GoogleLogin: ({ onSuccess, onError }: any) => (
        <div data-testid="google-btn">
            <button data-testid="google-success" onClick={() => onSuccess?.({ credential: "test-token" })}>Success</button>
            <button data-testid="google-error" onClick={() => onError?.()}>Error</button>
            <button data-testid="google-no-cred" onClick={() => onSuccess?.({})}>No Cred</button>
        </div>
    ),
}));

// Mock process.env
vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "test-client-id");

describe("GoogleLoginButton", () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it("renders skeleton initially then GoogleLogin button when loaded", async () => {
        render(<GoogleLoginButton />);
        // Initially skeleton should show
        const skeleton = document.querySelector(".animate-pulse");
        expect(skeleton).toBeInTheDocument();
        // After useEffect runs, GoogleLogin should render
        expect(await screen.findByTestId("google-btn")).toBeInTheDocument();
    });

    it("calls googleLogin on success and redirects", async () => {
        const originalLocation = window.location;
        delete (window as any).location;
        (window as any).location = { href: "" };

        mockGoogleLogin.mockResolvedValue(undefined);
        render(<GoogleLoginButton />);
        const successBtn = await screen.findByTestId("google-success");
        successBtn.click();

        await vi.waitFor(() => {
            expect(mockGoogleLogin).toHaveBeenCalledWith("test-token");
        });

        (window as any).location = originalLocation;
    });

    it("shows error when credential is missing", async () => {
        render(<GoogleLoginButton />);
        const noCredBtn = await screen.findByTestId("google-no-cred");
        noCredBtn.click();
        expect(await screen.findByText(/No credential/)).toBeInTheDocument();
    });

    it("shows error on Google login failure", async () => {
        render(<GoogleLoginButton />);
        const errorBtn = await screen.findByTestId("google-error");
        errorBtn.click();
        expect(await screen.findByText(/Google login failed/)).toBeInTheDocument();
    });

    it("shows error when googleLogin API call fails", async () => {
        mockGoogleLogin.mockRejectedValue(new Error("Login failed"));
        const originalLocation = window.location;
        delete (window as any).location;
        (window as any).location = { href: "" };

        render(<GoogleLoginButton />);
        const successBtn = await screen.findByTestId("google-success");
        successBtn.click();

        expect(await screen.findByText(/loginFailed/)).toBeInTheDocument();

        (window as any).location = originalLocation;
    });
});
