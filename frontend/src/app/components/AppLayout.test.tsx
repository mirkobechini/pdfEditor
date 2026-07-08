import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AppLayout from "./AppLayout";
import { useAuth } from "../lib/auth";

// Mock auth
vi.mock("../lib/auth", () => ({
  useAuth: vi.fn(),
}));

// Mock matchMedia for HeaderControls dark mode
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

const mockUser = {
  id: "1",
  email: "test@example.com",
  full_name: "Test User",
  is_active: true,
  is_admin: false,
  license_tier: "free",
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
  (useAuth as any).mockReturnValue({
    user: null,
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    token: null,
  });
});

const renderLayout = () =>
  render(
    <AppLayout
      sidebar={<div>Sidebar</div>}
      toolbar={<div>Toolbar</div>}
      viewer={<div>Viewer</div>}
    />
  );

describe("AppLayout header order", () => {
  it("renders header controls first (rightmost in order), then bug report, then user info", () => {
    (useAuth as any).mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      token: "token",
    });

    renderLayout();

    const header = document.querySelector("header")!;
    const rightSide = header.querySelector(".flex.items-center.gap-3:last-child")!;
    const children = Array.from(rightSide.children);

    // Find indices of key components in order
    const darkModeIdx = children.findIndex(
      (c) => c.querySelector('[title="toggle"]')
    );
    const langSelectorIdx = children.findIndex(
      (c) => c.querySelector("select")
    );
    const bugReportIdx = children.findIndex(
      (c) => c.textContent === "button"
    );
    const userNameIdx = children.findIndex(
      (c) => c.textContent?.includes("Test User")
    );
    const logoutIdx = children.findIndex(
      (c) => c.textContent === "logout"
    );

    // HeaderControls (dark mode + language) should come first
    expect(darkModeIdx).toBeLessThan(bugReportIdx);
    expect(langSelectorIdx).toBeLessThan(bugReportIdx);
    // Bug report should come before user info
    expect(bugReportIdx).toBeLessThan(userNameIdx);
    // User name should come before logout
    expect(userNameIdx).toBeLessThan(logoutIdx);
  });

  it("renders header controls and bug report even without user", () => {
    (useAuth as any).mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      token: null,
    });

    renderLayout();

    expect(screen.getByTitle("toggle")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("button")).toBeInTheDocument();
    // User info should not appear
    expect(screen.queryByText("logout")).not.toBeInTheDocument();
  });
});