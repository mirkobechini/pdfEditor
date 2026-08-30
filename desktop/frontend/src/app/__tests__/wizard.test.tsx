import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WizardPage from "../wizard/page";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));

vi.mock("../../shared/tauri", () => ({
  isTauri: () => true,
  tauriInvoke: vi.fn(),
  getApiBaseUrl: () => "http://127.0.0.1:7723",
  getCloudApiBaseUrl: () => "https://pdfeditor-api.mirkobechini.com",
}));

vi.mock("../../lib/preferences", () => ({
  usePreferences: () => ({
    prefs: { default_zoom: 100, theme: "dark", language: "it", antialiasing: true, density: "comfortable", default_save_folder: "" },
    updatePrefs: vi.fn(),
  }),
}));

describe("WizardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ── Step 0: Welcome ──
  it("renders first step with title", () => {
    render(<WizardPage />);
    expect(screen.getByText("welcomeTitle")).toBeInTheDocument();
  });

  it("shows STEP 01 label", () => {
    render(<WizardPage />);
    expect(screen.getByText("step01")).toBeInTheDocument();
  });

  it("shows description text on step 0", () => {
    render(<WizardPage />);
    expect(screen.getByText(/welcomeDesc/)).toBeInTheDocument();
  });

  it("shows terms checkbox", () => {
    render(<WizardPage />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it("shows terms link buttons", () => {
    render(<WizardPage />);
    expect(screen.getByText("licenseTerms")).toBeInTheDocument();
    expect(screen.getByText("privacyPolicy")).toBeInTheDocument();
  });

  it("shows Continua and Salta buttons on step 0", () => {
    render(<WizardPage />);
    expect(screen.getByText("continue")).toBeInTheDocument();
    expect(screen.getByText("skip")).toBeInTheDocument();
  });

  it("disables Continua when checkbox unchecked", () => {
    render(<WizardPage />);
    const continuaBtn = screen.getByText("continue");
    expect(continuaBtn).toBeDisabled();
  });

  it("enables Continua when checkbox checked", () => {
    render(<WizardPage />);
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    const continuaBtn = screen.getByText("continue");
    expect(continuaBtn).not.toBeDisabled();
  });

  // ── Step 1: Folder selection ──
  it("shows step 2 after Continua click", () => {
    render(<WizardPage />);
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByText("continue"));
    const cartellaElements = screen.getAllByText("workFolder");
    expect(cartellaElements.length).toBeGreaterThanOrEqual(1);
  });

  it("shows STEP 02 label on step 2", () => {
    render(<WizardPage />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("continue"));
    expect(screen.getByText("step02")).toBeInTheDocument();
  });

  it("shows folder path input on step 2", () => {
    render(<WizardPage />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("continue"));
    expect(screen.getByPlaceholderText("folderPlaceholder")).toBeInTheDocument();
  });

  it("shows Sfoglia button on step 2", () => {
    render(<WizardPage />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("continue"));
    expect(screen.getByText("browse")).toBeInTheDocument();
  });

  it("shows Indicizzazione toggle on step 2", () => {
    render(<WizardPage />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("continue"));
    expect(screen.getByText("fileIndexing")).toBeInTheDocument();
  });

  it("shows Indietro button on step 2", () => {
    render(<WizardPage />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("continue"));
    expect(screen.getByText("back")).toBeInTheDocument();
  });

  it("shows Fine button on step 2", () => {
    render(<WizardPage />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("continue"));
    expect(screen.getByText(/finish/)).toBeInTheDocument();
  });

  it("goes back to step 1 on Indietro click", () => {
    render(<WizardPage />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("continue"));
    fireEvent.click(screen.getByText("back"));
    expect(screen.getByText("welcomeTitle")).toBeInTheDocument();
  });

  it("toggles indexing on step 2", () => {
    render(<WizardPage />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("continue"));
    const toggleArea = screen.getByText("fileIndexing").closest("label")!;
    const toggleBtn = toggleArea.querySelector('[class*="rounded-full"]')!;
    fireEvent.click(toggleBtn);
    // Toggle should have bg-[#f7871f] class when active
    expect(toggleBtn.className).toContain("bg-[#f7871f]");
  });

  // ── Skip / Finish ──
  it("stores wizard_done and redirects on Skip", () => {
    render(<WizardPage />);
    fireEvent.click(screen.getByText("skip"));
    expect(localStorage.getItem("pdfeditor_wizard_done")).toBe("true");
    expect(mockPush).toHaveBeenCalledWith("/login");
  });

  it("stores wizard_done and redirects to /login on Finish", () => {
    render(<WizardPage />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("continue"));
    fireEvent.click(screen.getByText(/finish/));
    expect(localStorage.getItem("pdfeditor_wizard_done")).toBe("true");
    expect(mockPush).toHaveBeenCalledWith("/login");
  });

  // ── Sidebar ──
  it("shows sidebar with step indicators", () => {
    render(<WizardPage />);
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
  });

  it("shows SETUP progress in sidebar", () => {
    render(<WizardPage />);
    expect(screen.getByText("setupProgress")).toBeInTheDocument();
  });

  it("shows SETUP 2 DI 2 on step 2", () => {
    render(<WizardPage />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("continue"));
    expect(screen.getByText("setupProgress")).toBeInTheDocument();
  });

  it("shows completed checkmark on step 1 sidebar after moving to step 2", () => {
    render(<WizardPage />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("continue"));
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  // ── Folder input ──
  it("updates folder path on input change", () => {
    render(<WizardPage />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("continue"));
    const input = screen.getByPlaceholderText("folderPlaceholder");
    fireEvent.change(input, { target: { value: "D:\\MyPDFs" } });
    expect(input).toHaveValue("D:\\MyPDFs");
  });

  it("shows Cerca e organizza description on step 2", () => {
    render(<WizardPage />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("continue"));
    expect(screen.getByText("fileIndexingDesc")).toBeInTheDocument();
  });

  it("shows pdfeditor icon in sidebar", () => {
    render(<WizardPage />);
    const icon = document.querySelector('.bg-\\[\\#f7871f\\]');
    expect(icon).toBeInTheDocument();
  });
});