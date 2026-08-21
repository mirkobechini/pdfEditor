import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WizardPage from "../wizard/page";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("../../shared/tauri", () => ({
  isTauri: () => true,
  tauriInvoke: vi.fn(),
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
});
