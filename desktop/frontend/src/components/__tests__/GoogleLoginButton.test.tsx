import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockGoogleLogin = vi.fn();
let mockIsTauri = true;

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      continueWithGoogle: "Continue with Google",
      googleAuthFailed: "Google authentication failed",
    };
    return map[key] || key;
  },
}));

vi.mock("../../shared/auth", () => ({
  useAuth: () => ({
    googleLogin: (...args: any[]) => mockGoogleLogin(...args),
  }),
}));

vi.mock("../../shared/tauri", () => ({
  isTauri: () => mockIsTauri,
  getApiBaseUrl: () => "http://127.0.0.1:7723",
  getCloudApiBaseUrl: () => "https://pdfeditor-api.mirkobechini.com",
  tauriInvoke: vi.fn(),
}));

import GoogleLoginButton from "../GoogleLoginButton";

describe("GoogleLoginButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsTauri = true;
  });

  it("renders Google login button for desktop after mount", async () => {
    render(<GoogleLoginButton />);
    const text = await screen.findByText("Continue with Google", {}, { timeout: 3000 });
    expect(text).toBeInTheDocument();
  });

  it("renders button element", async () => {
    render(<GoogleLoginButton />);
    const btn = await screen.findByRole("button", {}, { timeout: 3000 });
    expect(btn).toBeInTheDocument();
  });

  it("shows button after mount (not skeleton)", () => {
    render(<GoogleLoginButton />);
    const skeleton = document.querySelector(".animate-pulse");
    expect(skeleton).not.toBeInTheDocument();
  });

  it("returns null when noClientId is true (web without Google client ID)", async () => {
    mockIsTauri = false;
    const originalEnv = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "";

    const { container } = render(<GoogleLoginButton />);
    await new Promise((r) => setTimeout(r, 100));
    expect(container.innerHTML).toBe("");

    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = originalEnv;
  });
});
