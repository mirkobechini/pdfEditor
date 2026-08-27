import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HeaderControls, { ToggleDarkMode, LanguageSelector } from "./HeaderControls";

// Mock i18n
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock("../lib/auth", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock useLocaleSetter
const mockSetLocale = vi.fn();
vi.mock("../lib/i18n", () => ({
  useLocaleSetter: () => mockSetLocale,
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
  mockUseAuth.mockReturnValue({ user: null });
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

  it("changes locale on selection change", () => {
    render(<LanguageSelector />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "it" } });
    expect(mockSetLocale).toHaveBeenCalledWith("it");
  });
});

describe("HeaderControls with user", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null });
  });

  it("shows guest badge for guest user", () => {
    mockUseAuth.mockReturnValue({
      user: { is_guest: true, email: "guest@test.com", full_name: "Guest User", is_admin: false, id: "1" },
    });
    render(<HeaderControls />);
    expect(screen.getByText("Guest")).toBeTruthy();
    expect(screen.getByText("Guest User ⚙️")).toBeTruthy();
  });

  it("shows profile link with full name", () => {
    mockUseAuth.mockReturnValue({
      user: { is_guest: false, email: "a@b.com", full_name: "Alice", is_admin: false, id: "1" },
    });
    render(<HeaderControls />);
    expect(screen.getByText("Alice ⚙️")).toBeTruthy();
    const link = screen.getByText("Alice ⚙️").closest("a");
    expect(link?.getAttribute("href")).toBe("/app/profile");
  });

  it("does not show guest badge for regular user", () => {
    mockUseAuth.mockReturnValue({
      user: { is_guest: false, email: "a@b.com", full_name: "Alice", is_admin: false, id: "1" },
    });
    render(<HeaderControls />);
    expect(screen.queryByText("Guest")).toBeNull();
  });

  it("does not show user info when no user", () => {
    mockUseAuth.mockReturnValue({ user: null });
    render(<HeaderControls />);
    expect(screen.queryByText("Alice ⚙️")).toBeNull();
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