import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      continueWithGoogle: "Continue with Google",
    };
    return map[key] || key;
  },
}));

vi.mock("../../shared/auth", () => ({
  useAuth: () => ({
    googleLogin: vi.fn(),
  }),
}));

vi.mock("../../shared/tauri", () => ({
  isTauri: () => true,
  getApiBaseUrl: () => "http://127.0.0.1:7723",
  getCloudApiBaseUrl: () => "https://pdfeditor-api.mirkobechini.com",
  tauriInvoke: vi.fn(),
}));

import GoogleLoginButton from "../GoogleLoginButton";

describe("GoogleLoginButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
