import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import StartupPage from "../startup/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("../../shared/tauri", () => ({
  getApiBaseUrl: () => "http://127.0.0.1:7723",
}));

describe("StartupPage", () => {
  it("renders startup steps", () => {
    render(<StartupPage />);
    expect(screen.getByText("Avvio del backend in locale...")).toBeInTheDocument();
  });
});
