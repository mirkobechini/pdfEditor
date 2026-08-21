import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WizardPage from "../wizard/page";

const mockPush = vi.fn();
const mockTauriInvoke = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("../../shared/tauri", () => ({
  isTauri: () => true,
  tauriInvoke: (...args: any[]) => mockTauriInvoke(...args),
}));

describe("WizardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders first step", () => {
    render(<WizardPage />);
    expect(screen.getByText("Benvenuto in PdfEditor")).toBeInTheDocument();
  });

  it("shows terms checkbox", () => {
    render(<WizardPage />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it("shows Continua and Salta buttons", () => {
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
});