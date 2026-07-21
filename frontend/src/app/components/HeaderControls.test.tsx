import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HeaderControls, { ToggleDarkMode, LanguageSelector } from "./HeaderControls";

// Mock i18n
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock useAuth
vi.mock("../lib/auth", () => ({
  useAuth: () => ({ user: null }),
}));

// Mock useLocaleControl
vi.mock("../lib/i18n", () => ({
  useLocaleControl: () => ({ locale: "en", setLocale: vi.fn() }),
}));

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
  document.documentElement.classList.remove("dark");
});

describe("HeaderControls", () => {
  it("renders dark mode toggle and language selector", () => {
    render(<HeaderControls />);
    expect(screen.getByTitle("toggle")).toBeTruthy();
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("toggles dark mode on click", () => {
    render(<HeaderControls />);
    fireEvent.click(screen.getByTitle("toggle"));
    expect(screen.getByText("☀️")).toBeTruthy();
  });
});

describe("ToggleDarkMode", () => {
  it("renders moon icon by default", () => {
    render(<ToggleDarkMode />);
    expect(screen.getByText("🌙")).toBeTruthy();
  });

  it("toggles to sun icon on click", () => {
    render(<ToggleDarkMode />);
    fireEvent.click(screen.getByTitle("toggle"));
    expect(screen.getByText("☀️")).toBeTruthy();
  });
});

describe("LanguageSelector", () => {
  it("renders with current locale", () => {
    render(<LanguageSelector />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("en");
  });

  it("has both language options", () => {
    render(<LanguageSelector />);
    expect(screen.getByText("IT")).toBeTruthy();
    expect(screen.getByText("EN")).toBeTruthy();
  });
});

// Restore original matchMedia for remaining tests
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});