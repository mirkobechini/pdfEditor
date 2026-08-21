import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SettingsPage from "../settings/page";

const mockUpdatePrefs = vi.fn();
const mockSetLocale = vi.fn();

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

vi.mock("../../lib/i18n", () => ({
  useLocaleSetter: () => mockSetLocale,
}));

vi.mock("../../lib/preferences", () => ({
  usePreferences: () => ({
    prefs: { theme: "dark", language: "it", default_zoom: 100, antialiasing: true, density: "comfortable" },
    updatePrefs: (...args: any[]) => mockUpdatePrefs(...args),
    reload: vi.fn(),
  }),
}));

vi.mock("../../shared/auth", () => ({ useAuth: () => ({ user: { id: "u1", email: "test@test.com", license_tier: "Free" }, logout: vi.fn() }) }));

vi.mock("../../shared/tauri", () => ({
  isTauri: () => true,
  tauriInvoke: vi.fn(),
}));

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders settings sections", () => {
    render(<SettingsPage />);
    expect(screen.getByText("general")).toBeInTheDocument();
  });

  it("renders all section tabs", () => {
    render(<SettingsPage />);
    expect(screen.getByText("general")).toBeInTheDocument();
    expect(screen.getByText("appearance")).toBeInTheDocument();
    expect(screen.getByText("editor")).toBeInTheDocument();
    expect(screen.getByText("shortcuts")).toBeInTheDocument();
    expect(screen.getByText("advanced")).toBeInTheDocument();
    expect(screen.getByText("about")).toBeInTheDocument();
  });

  it("shows general tab content by default", () => {
    render(<SettingsPage />);
    expect(screen.getByText("generalTitle")).toBeInTheDocument();
    expect(screen.getByText("generalDesc")).toBeInTheDocument();
  });

  it("switches to appearance tab", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("appearance"));
    expect(screen.getByText("appearanceTitle")).toBeInTheDocument();
    expect(screen.getByText("appearanceDesc")).toBeInTheDocument();
  });

  it("switches to about tab", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("about"));
    expect(screen.getByText("Motore PDF")).toBeInTheDocument();
    expect(screen.getByText("Shell desktop")).toBeInTheDocument();
    expect(screen.getByText("Sidecar")).toBeInTheDocument();
  });

  it("shows license info in about tab", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("about"));
    expect(screen.getByText("Licenza applicazione")).toBeInTheDocument();
    expect(screen.getByText("Licenze di terze parti")).toBeInTheDocument();
  });

  it("switches to editor tab", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("editor"));
    expect(screen.getByText("editorTitle")).toBeInTheDocument();
  });

  it("switches to shortcuts tab", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("shortcuts"));
    expect(screen.getByText("shortcutsTitle")).toBeInTheDocument();
  });

  it("switches to advanced tab", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("advanced"));
    expect(screen.getByText("advancedTitle")).toBeInTheDocument();
  });

  it("shows language selector in general tab", () => {
    render(<SettingsPage />);
    expect(screen.getByText("language")).toBeInTheDocument();
  });

  it("shows autoStart option in general tab", () => {
    render(<SettingsPage />);
    expect(screen.getByText("autoStart")).toBeInTheDocument();
    expect(screen.getByText("autoStartDesc")).toBeInTheDocument();
  });

  it("shows density selector in appearance tab", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("appearance"));
    expect(screen.getByText("density")).toBeInTheDocument();
    expect(screen.getByText("densityDesc")).toBeInTheDocument();
  });

  it("shows antialiasing toggle in appearance tab", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("appearance"));
    expect(screen.getByText("antialiasing")).toBeInTheDocument();
    expect(screen.getByText("antialiasingDesc")).toBeInTheDocument();
  });

  it("shows version info in about tab", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("about"));
    expect(screen.getByText("appLicense")).toBeInTheDocument();
    expect(screen.getByText("Licenze di terze parti")).toBeInTheDocument();
  });

  it("shows editor tab content", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("editor"));
    expect(screen.getByText("editorTitle")).toBeInTheDocument();
    expect(screen.getByText("editorDesc")).toBeInTheDocument();
  });

  it("shows shortcuts tab content", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("shortcuts"));
    expect(screen.getByText("shortcutsTitle")).toBeInTheDocument();
    expect(screen.getByText("shortcutsDesc")).toBeInTheDocument();
  });

  it("shows advanced tab content", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("advanced"));
    expect(screen.getByText("advancedTitle")).toBeInTheDocument();
    expect(screen.getByText("advancedDesc")).toBeInTheDocument();
  });

  it("shows back button in sidebar", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Torna all'editor")).toBeInTheDocument();
  });

  it("shows sidebar sections", () => {
    render(<SettingsPage />);
    expect(screen.getByText("general")).toBeInTheDocument();
  });

  it("shows language current value", () => {
    render(<SettingsPage />);
    const italianoElements = screen.getAllByText("Italiano");
    expect(italianoElements.length).toBeGreaterThanOrEqual(1);
  });
});
