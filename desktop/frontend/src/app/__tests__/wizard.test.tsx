import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WizardPage from "../wizard/page";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

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
    expect(screen.getByText("Benvenuto in PdfEditor")).toBeInTheDocument();
  });

  it("shows STEP 01 label", () => {
    render(<WizardPage />);
    expect(screen.getByText("STEP 01")).toBeInTheDocument();
  });

  it("shows description text on step 0", () => {
    render(<WizardPage />);
    expect(screen.getByText(/Editing PDF di precisione/)).toBeInTheDocument();
  });

  it("shows terms checkbox", () => {
    render(<WizardPage />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it("shows terms link buttons", () => {
    render(<WizardPage />);
    expect(screen.getByText("termini di licenza")).toBeInTheDocument();
    expect(screen.getByText("privacy policy")).toBeInTheDocument();
  });

  it("shows Continua and Salta buttons on step 0", () => {
    render(<WizardPage />);
    expect(screen.getByText("Continua")).toBeInTheDocument();
    expect(screen.getByText("Salta")).toBeInTheDocument();
  });

  it("disables Continua when checkbox unchecked", () => {
    render(<WizardPage />);
    const continuaBtn = screen.getByText("Continua");
    expect(continuaBtn).toBeDisabled();
  });

  it("enables Continua when checkbox checked", () => {
    render(<WizardPage />);
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    const continuaBtn = screen.getByText("Continua");
    expect(continuaBtn).not.toBeDisabled();
  });

  // ── Step 1: Folder selection ──
  it("shows step 2 after Continua click", () => {
    render(<WizardPage />);
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByText("Continua"));
    const cartellaElements = screen.getAllByText("Cartella di lavoro");
    expect(cartellaElements.length).toBeGreaterThanOrEqual(1);
  });

  it("shows STEP 02 label on step 2", () => {
    render(<WizardPage />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("Continua"));
    expect(screen.getByText("STEP 02")).toBeInTheDocument();
  });

  it("shows folder path input on step 2", () => {
    render(<WizardPage />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("Continua"));
    expect(screen.getByPlaceholderText(/C:\\Users/)).toBeInTheDocument();
  });

  it("shows Sfoglia button on step 2", () => {
    render(<WizardPage />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("Continua"));
    expect(screen.getByText("Sfoglia…")).toBeInTheDocument();
  });

  it("shows Indicizzazione toggle on step 2", () => {
    render(<WizardPage />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("Continua"));
    expect(screen.getByText("Indicizzazione file")).toBeInTheDocument();
  });

  it("shows Indietro button on step 2", () => {
    render(<WizardPage />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("Continua"));
    expect(screen.getByText("Indietro")).toBeInTheDocument();
  });

  it("shows Fine button on step 2", () => {
    render(<WizardPage />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("Continua"));
    expect(screen.getByText(/Fine/)).toBeInTheDocument();
  });

  it("goes back to step 1 on Indietro click", () => {
    render(<WizardPage />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("Continua"));
    fireEvent.click(screen.getByText("Indietro"));
    expect(screen.getByText("Benvenuto in PdfEditor")).toBeInTheDocument();
  });

  it("toggles indexing on step 2", () => {
    render(<WizardPage />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("Continua"));
    const toggleArea = screen.getByText("Indicizzazione file").closest("label")!;
    const toggleBtn = toggleArea.querySelector('[class*="rounded-full"]')!;
    fireEvent.click(toggleBtn);
    // Toggle should have bg-[#f7871f] class when active
    expect(toggleBtn.className).toContain("bg-[#f7871f]");
  });

  // ── Skip / Finish ──
  it("stores wizard_done and redirects on Skip", () => {
    render(<WizardPage />);
    fireEvent.click(screen.getByText("Salta"));
    expect(localStorage.getItem("pdfeditor_wizard_done")).toBe("true");
    expect(mockPush).toHaveBeenCalledWith("/login");
  });

  it("redirects to /app on Finish", () => {
    render(<WizardPage />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("Continua"));
    fireEvent.click(screen.getByText(/Fine/));
    expect(mockPush).toHaveBeenCalledWith("/app");
  });

  // ── Sidebar ──
  it("shows sidebar with step indicators", () => {
    render(<WizardPage />);
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
  });

  it("shows SETUP progress in sidebar", () => {
    render(<WizardPage />);
    expect(screen.getByText("SETUP 1 DI 2")).toBeInTheDocument();
  });

  it("shows SETUP 2 DI 2 on step 2", () => {
    render(<WizardPage />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("Continua"));
    expect(screen.getByText("SETUP 2 DI 2")).toBeInTheDocument();
  });

  it("shows completed checkmark on step 1 sidebar after moving to step 2", () => {
    render(<WizardPage />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("Continua"));
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  // ── Folder input ──
  it("updates folder path on input change", () => {
    render(<WizardPage />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("Continua"));
    const input = screen.getByPlaceholderText(/C:\\Users/);
    fireEvent.change(input, { target: { value: "D:\\MyPDFs" } });
    expect(input).toHaveValue("D:\\MyPDFs");
  });

  it("shows Cerca e organizza description on step 2", () => {
    render(<WizardPage />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("Continua"));
    expect(screen.getByText("Cerca e organizza automaticamente i PDF")).toBeInTheDocument();
  });

  it("shows pdfeditor icon in sidebar", () => {
    render(<WizardPage />);
    const icon = document.querySelector('.bg-\\[\\#f7871f\\]');
    expect(icon).toBeInTheDocument();
  });
});