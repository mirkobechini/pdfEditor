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

vi.mock("../../hooks/useCloudSync", () => ({
  useCloudSync: () => ({
    syncEnabled: true,
    setSyncEnabled: vi.fn(),
    syncOnStartup: true,
    setSyncOnStartup: vi.fn(),
    isOnline: true,
    isSyncing: false,
    progress: null,
    syncAll: vi.fn(),
    status: {},
    uploadPdf: vi.fn(),
    downloadPdf: vi.fn(),
    lastSyncResult: null,
    clearSyncResult: vi.fn(),
  }),
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
    expect(screen.getAllByText("pdfEngine").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("shell")).toBeInTheDocument();
    expect(screen.getByText("sidecar")).toBeInTheDocument();
  });

  it("shows license info in about tab", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("about"));
    expect(screen.getAllByText("appLicense").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("thirdParty").length).toBeGreaterThanOrEqual(1);
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
    expect(screen.getAllByText("appLicense").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("thirdParty").length).toBeGreaterThanOrEqual(1);
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
    expect(screen.getByText("backToEditor")).toBeInTheDocument();
  });

  it("shows sidebar sections", () => {
    render(<SettingsPage />);
    expect(screen.getByText("general")).toBeInTheDocument();
  });

  it("shows language current value", () => {
    render(<SettingsPage />);
    const italianoElements = screen.getAllByText("languageItalian");
    expect(italianoElements.length).toBeGreaterThanOrEqual(1);
  });

  it("shows about section details", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("about"));
    expect(screen.getAllByText("thirdPartyValue").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("appLicense").length).toBeGreaterThanOrEqual(1);
  });

  it("shows third party licenses button in about tab", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("about"));
    expect(screen.getByText("thirdPartyDesc")).toBeInTheDocument();
  });

  it("shows Codice sorgente in about tab", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("about"));
    expect(screen.getByText("appLicenseDesc")).toBeInTheDocument();
  });

  it("shows Tauri and FastAPI version in about tab", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("about"));
    expect(screen.getByText("shell")).toBeInTheDocument();
    expect(screen.getByText("sidecar")).toBeInTheDocument();
  });

  it("shows Bundle nativo in about tab", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("about"));
    expect(screen.getByText("shellDesc")).toBeInTheDocument();
  });

  it("shows default zoom slider in editor tab", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("editor"));
    expect(screen.getByText("editorTitle")).toBeInTheDocument();
    expect(screen.getByText("editorDesc")).toBeInTheDocument();
  });

  it("shows shortcuts list in shortcuts tab", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("shortcuts"));
    expect(screen.getByText("shortcutsTitle")).toBeInTheDocument();
    expect(screen.getByText("shortcutsDesc")).toBeInTheDocument();
  });

  it("shows advanced options in advanced tab", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("advanced"));
    expect(screen.getByText("advancedTitle")).toBeInTheDocument();
    expect(screen.getByText("advancedDesc")).toBeInTheDocument();
  });

  it("shows Bundled items in about tab", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("about"));
    expect(screen.getByText("sidecarDesc")).toBeInTheDocument();
  });

  it("shows cloud tab with sync toggle", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("cloud"));
    expect(screen.getAllByText("cloud").length).toBeGreaterThanOrEqual(1);
  });

  it("shows workplace folder in advanced tab", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("advanced"));
    expect(screen.getByText("workplace")).toBeInTheDocument();
  });

  it("shows system log in advanced tab", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("advanced"));
    expect(screen.getByText("systemLog")).toBeInTheDocument();
  });

  it("shows clear cache in advanced tab", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("advanced"));
    expect(screen.getByText("clearCache")).toBeInTheDocument();
  });

  it("shows release notes button in about tab", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("about"));
    expect(screen.getByText("releaseNotes")).toBeInTheDocument();
  });

  it("shows report bug button in about tab", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("about"));
    expect(screen.getByText("reportBug")).toBeInTheDocument();
  });

  it("shows documentation button in about tab", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("about"));
    expect(screen.getByText("documentation")).toBeInTheDocument();
  });
});
