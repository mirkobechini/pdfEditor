import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RegisterPage from "./page";
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

const mockRegister = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (useAuth as any).mockReturnValue({
    user: null,
    loading: false,
    login: vi.fn(),
    register: mockRegister,
    logout: vi.fn(),
    token: null,
  });

  // Mock window.location.href
  delete (window as any).location;
  (window as any).location = { href: "" };
});

describe("RegisterPage", () => {
  it("renders register form", () => {
    render(<RegisterPage />);

    expect(screen.getByText("auth.registerTitle")).toBeTruthy();
    expect(screen.getByText("auth.fullName")).toBeTruthy();
    expect(screen.getByText("auth.email")).toBeTruthy();
    expect(screen.getByText("auth.password")).toBeTruthy();
    expect(screen.getByText("auth.confirmPassword")).toBeTruthy();
    expect(screen.getByText("auth.registerButton")).toBeTruthy();
    expect(screen.getByText("auth.hasAccount")).toBeTruthy();
    expect(screen.getByText("auth.loginLink")).toBeTruthy();
  });

  it("has Register button disabled when form is empty", () => {
    render(<RegisterPage />);
    expect(screen.getByText("auth.registerButton")).toBeDisabled();
  });

  it("enables Register button when form is filled", () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByPlaceholderText("Mario Rossi"), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getAllByPlaceholderText("email@example.com")[0], {
      target: { value: "test@example.com" },
    });
    const passwordInputs = screen.getAllByPlaceholderText("••••••••");
    fireEvent.change(passwordInputs[0], { target: { value: "password123" } });
    fireEvent.change(passwordInputs[1], { target: { value: "password123" } });

    expect(screen.getByText("auth.registerButton")).toBeEnabled();
  });

  it("shows error when passwords do not match", async () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByPlaceholderText("Mario Rossi"), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getAllByPlaceholderText("email@example.com")[0], {
      target: { value: "test@example.com" },
    });
    const passwordInputs = screen.getAllByPlaceholderText("••••••••");
    fireEvent.change(passwordInputs[0], { target: { value: "password123" } });
    fireEvent.change(passwordInputs[1], { target: { value: "different" } });

    fireEvent.click(screen.getByText("auth.registerButton"));

    expect(screen.getByText("auth.passwordMismatch")).toBeTruthy();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("calls register on submit and redirects", async () => {
    mockRegister.mockResolvedValue(undefined);

    render(<RegisterPage />);

    fireEvent.change(screen.getByPlaceholderText("Mario Rossi"), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getAllByPlaceholderText("email@example.com")[0], {
      target: { value: "test@example.com" },
    });
    const passwordInputs = screen.getAllByPlaceholderText("••••••••");
    fireEvent.change(passwordInputs[0], { target: { value: "password123" } });
    fireEvent.change(passwordInputs[1], { target: { value: "password123" } });

    fireEvent.click(screen.getByText("auth.registerButton"));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith("test@example.com", "password123", "Test User");
    });
    expect(window.location.href).toBe("/");
  });

  it("shows error message on failed registration", async () => {
    mockRegister.mockRejectedValue(new Error("Email already exists"));

    render(<RegisterPage />);

    fireEvent.change(screen.getByPlaceholderText("Mario Rossi"), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getAllByPlaceholderText("email@example.com")[0], {
      target: { value: "test@example.com" },
    });
    const passwordInputs = screen.getAllByPlaceholderText("••••••••");
    fireEvent.change(passwordInputs[0], { target: { value: "password123" } });
    fireEvent.change(passwordInputs[1], { target: { value: "password123" } });

    fireEvent.click(screen.getByText("auth.registerButton"));

    await waitFor(() => {
      expect(screen.getByText(/auth.registerFailed/)).toBeTruthy();
    });
  });

  it("has a link to login page", () => {
    render(<RegisterPage />);
    const link = screen.getByText("auth.loginLink");
    expect(link.getAttribute("href")).toBe("/login");
  });
});