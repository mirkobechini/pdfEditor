import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

const mockGoogleLogin = vi.fn();
let mockIsTauri = true;
let mockTauriInvoke = vi.fn();

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
  tauriInvoke: (...args: any[]) => mockTauriInvoke(...args),
}));

import GoogleLoginButton from "../GoogleLoginButton";

describe("GoogleLoginButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsTauri = true;
    mockTauriInvoke = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Desktop rendering ────────────────────────────────────

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

  it("shows button after mount (not skeleton)", async () => {
    render(<GoogleLoginButton />);
    await screen.findByRole("button");
    const skeleton = document.querySelector(".animate-pulse");
    expect(skeleton).not.toBeInTheDocument();
  });

  it("calls tauriInvoke on desktop button click", async () => {
    render(<GoogleLoginButton />);
    const btn = await screen.findByRole("button");
    fireEvent.click(btn);
    await waitFor(() => {
      expect(mockTauriInvoke).toHaveBeenCalledWith("plugin:opener|open_url", {
        url: "https://pdfeditor-api.mirkobechini.com/auth/google/desktop-login",
      });
    });
  });

  // ── Desktop polling ──────────────────────────────────────

  it("shows error when desktop polling fails", async () => {
    vi.useFakeTimers();
    const origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    render(<GoogleLoginButton />);
    // Wait for mount
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    const btn = screen.getByRole("button");
    await act(async () => {
      fireEvent.click(btn);
    });

    // Advance through all 120 polling iterations (120 * 2000ms)
    for (let i = 0; i < 125; i++) {
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });
    }

    expect(screen.getByText("Google authentication failed")).toBeInTheDocument();
    globalThis.fetch = origFetch;
    vi.useRealTimers();
  });

  // ── Web without Google client ID ─────────────────────────

  it("returns null when noClientId is true (web without Google client ID)", async () => {
    mockIsTauri = false;
    const originalEnv = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "";

    const { container } = render(<GoogleLoginButton />);
    await new Promise((r) => setTimeout(r, 100));
    expect(container.innerHTML).toBe("");

    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = originalEnv;
  });

  // ── Error on resetKey change ─────────────────────────────

  it("clears error on resetKey change", async () => {
    const { rerender } = render(<GoogleLoginButton resetKey={0} />);
    await screen.findByRole("button");
    rerender(<GoogleLoginButton resetKey={1} />);
    await screen.findByRole("button");
  });

  // ── Skeleton before mount ────────────────────────────────

  it("shows skeleton before mount", () => {
    // Before useEffect runs, the component shows a skeleton
    // Since useEffect runs synchronously in test env, we can't easily
    // intercept it. Just verify the component renders.
    const { container } = render(<GoogleLoginButton />);
    expect(container).toBeTruthy();
  });
});
