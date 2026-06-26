import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "./page";
import { useAuth } from "../lib/auth";

// Mock the auth hook
vi.mock("../lib/auth", () => ({
  useAuth: vi.fn(),
}));

// Mock i18n
vi.mock("../lib/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "it" as const,
    setLocale: () => {},
  }),
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

const mockLogin = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (useAuth as any).mockReturnValue({
    user: null,
    loading: false,
    login: mockLogin,
    register: vi.fn(),
    logout: vi.fn(),
    token: null,
  });

  // Mock window.location.href
  delete (window as any).location;
  (window as any).location = { href: "" };
});

describe("LoginPage", () => {
  it("renders login form", () => {
    render(<LoginPage />);

    expect(screen.getByText("auth.loginTitle")).toBeTruthy();
    expect(screen.getByText("auth.email")).toBeTruthy();
    expect(screen.getByText("auth.password")).toBeTruthy();
    expect(screen.getByText("auth.loginButton")).toBeTruthy();
    expect(screen.getByText("auth.noAccount")).toBeTruthy();
    expect(screen.getByText("auth.registerLink")).toBeTruthy();
  });

  it("has Login button disabled when form is empty", () => {
    render(<LoginPage />);
    expect(screen.getByText("auth.loginButton")).toBeDisabled();
  });

  it("enables Login button when form is filled", () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("email@example.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "password123" },
    });

    expect(screen.getByText("auth.loginButton")).toBeEnabled();
  });

  it("calls login on submit and redirects", async () => {
    mockLogin.mockResolvedValue(undefined);

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("email@example.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByText("auth.loginButton"));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("test@example.com", "password123");
    });
    expect(window.location.href).toBe("/");
  });

  it("shows error message on failed login", async () => {
    mockLogin.mockRejectedValue(new Error("Invalid credentials"));

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("email@example.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "wrong" },
    });

    fireEvent.click(screen.getByText("auth.loginButton"));

    await waitFor(() => {
      expect(screen.getByText(/auth.loginFailed/)).toBeTruthy();
    });
  });

  it("has a link to register page", () => {
    render(<LoginPage />);
    const link = screen.getByText("auth.registerLink");
    expect(link.getAttribute("href")).toBe("/register");
  });
});