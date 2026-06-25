import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AppLayout from "./AppLayout";

// Mock i18n
vi.mock("../lib/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "it" as const,
    setLocale: () => {},
  }),
}));

// Mock auth
vi.mock("../lib/auth", () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    token: null,
  }),
}));

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

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

beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
  document.documentElement.classList.remove("dark");
});

describe("ToggleDarkMode", () => {
  it("defaults to light mode with no localStorage and no system preference", () => {
    render(
      <AppLayout sidebar={null} toolbar={null} viewer={null} />
    );

    // Default is light mode — moon icon visible
    expect(screen.getByText("🌙")).toBeTruthy();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("toggles dark mode on click", () => {
    render(
      <AppLayout sidebar={null} toolbar={null} viewer={null} />
    );

    fireEvent.click(screen.getByTitle("darkMode.toggle"));

    expect(screen.getByText("☀️")).toBeTruthy();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("persists dark mode preference to localStorage", () => {
    render(
      <AppLayout sidebar={null} toolbar={null} viewer={null} />
    );

    fireEvent.click(screen.getByTitle("darkMode.toggle"));

    expect(localStorageMock.getItem("darkMode")).toBe("true");
  });

  it("restores dark mode from localStorage on mount", () => {
    localStorageMock.setItem("darkMode", "true");

    render(
      <AppLayout sidebar={null} toolbar={null} viewer={null} />
    );

    expect(screen.getByText("☀️")).toBeTruthy();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("restores light mode from localStorage on mount", () => {
    localStorageMock.setItem("darkMode", "false");

    render(
      <AppLayout sidebar={null} toolbar={null} viewer={null} />
    );

    expect(screen.getByText("🌙")).toBeTruthy();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("toggles back to light mode and persists", () => {
    render(
      <AppLayout sidebar={null} toolbar={null} viewer={null} />
    );

    // Enable dark mode
    fireEvent.click(screen.getByTitle("darkMode.toggle"));
    expect(localStorageMock.getItem("darkMode")).toBe("true");

    // Disable dark mode
    fireEvent.click(screen.getByTitle("darkMode.toggle"));
    expect(localStorageMock.getItem("darkMode")).toBe("false");
    expect(screen.getByText("🌙")).toBeTruthy();
  });
});