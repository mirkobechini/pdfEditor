import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SettingsPage from "../settings/page";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("../../shared/api", () => ({
  api: {
    getPreferences: vi.fn().mockResolvedValue({ theme: "dark", language: "it", default_zoom: 100, antialiasing: true, density: "comfortable" }),
    setPreferences: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../../shared/auth", () => ({
  useAuth: () => ({ user: { id: "u1", email: "test@test.com" }, logout: vi.fn() }),
}));

vi.mock("../../lib/i18n", () => ({
  useLocaleSetter: () => vi.fn(),
}));

vi.mock("../../lib/preferences", () => ({
  usePreferences: () => ({
    prefs: { theme: "dark", language: "it", default_zoom: 100, antialiasing: true, density: "comfortable" },
    updatePrefs: vi.fn(),
    reload: vi.fn(),
  }),
}));

vi.mock("../../shared/tauri", () => ({
  isTauri: () => true,
  tauriInvoke: vi.fn(),
}));

describe("SettingsPage", () => {
  it("renders settings sections", () => {
    render(<SettingsPage />);
    expect(screen.getByText("general")).toBeInTheDocument();
  });
});
