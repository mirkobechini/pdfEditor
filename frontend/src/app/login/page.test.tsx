import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import LoginPage from "./page";
import { useAuth } from "../lib/auth";
import { isTauri } from "../lib/tauri";

// Mock the auth hook
vi.mock("../lib/auth", () => ({
  useAuth: vi.fn(),
}));

// Mock isTauri so we can toggle the guest login button
vi.mock("../lib/tauri", () => ({
  isTauri: vi.fn(),
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
const mockGuestLogin = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (useAuth as any).mockReturnValue({
    user: null,
    loading: false,
    login: mockLogin,
    guestLogin: mockGuestLogin,
    register: vi.fn(),
    logout: vi.fn(),
  });
  (isTauri as any).mockReturnValue(false);

  // Mock window.location.href
  delete (window as any).location;
  (window as any).location = { href: "" };
});

describe("LoginPage", () => {
  it("renders login form", () => {
    render(<LoginPage />);

    expect(screen.getByText("loginTitle")).toBeTruthy();
    expect(screen.getByText("email")).toBeTruthy();
    expect(screen.getByText("password")).toBeTruthy();
    expect(screen.getByText("loginButton")).toBeTruthy();
    expect(screen.getByText("noAccount")).toBeTruthy();
    expect(screen.getByText("registerLink")).toBeTruthy();
  });

  it("has Login button disabled when form is empty", () => {
    render(<LoginPage />);
    expect(screen.getByText("loginButton")).toBeDisabled();
  });

  it("enables Login button when form is filled", () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("email@example.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "password123" },
    });

    expect(screen.getByText("loginButton")).toBeEnabled();
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

    fireEvent.click(screen.getByText("loginButton"));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("test@example.com", "password123", false);
    });
    expect(window.location.href).toBe("/app");
  });

  it("shows invalid credentials message on wrong password", async () => {
    mockLogin.mockRejectedValue(new Error("Invalid email or password"));

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("email@example.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "wrong" },
    });

    fireEvent.click(screen.getByText("loginButton"));

    await waitFor(() => {
      expect(screen.getByText("invalidCredentials")).toBeTruthy();
    });
  });

  it("shows rate limit message on 429", async () => {
    mockLogin.mockRejectedValue(new Error("RATE_LIMIT"));

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("email@example.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "wrong" },
    });

    fireEvent.click(screen.getByText("loginButton"));

    await waitFor(() => {
      expect(screen.getByText("rateLimitExceeded")).toBeTruthy();
    });
  });

  it("shows generic error on unknown failure", async () => {
    mockLogin.mockRejectedValue(new Error("Something else"));

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("email@example.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "wrong" },
    });

    fireEvent.click(screen.getByText("loginButton"));

    await waitFor(() => {
      expect(screen.getByText("unknownError")).toBeTruthy();
    });
  });

  it("has a link to register page", () => {
    render(<LoginPage />);
    const link = screen.getByText("registerLink");
    expect(link.getAttribute("href")).toBe("/register");
  });

  it("redirects to /app when user is already authenticated", async () => {
    (useAuth as any).mockReturnValue({
      user: { email: "test@example.com" },
      loading: false,
      login: mockLogin,
      guestLogin: mockGuestLogin,
      register: vi.fn(),
      logout: vi.fn(),
    });

    render(<LoginPage />);
    await waitFor(() => {
      expect(window.location.href).toBe("/app");
    });
  });

  it("shows loading state while checking auth", () => {
    (useAuth as any).mockReturnValue({
      user: null,
      loading: true,
      login: mockLogin,
      guestLogin: mockGuestLogin,
      register: vi.fn(),
      logout: vi.fn(),
    });

    render(<LoginPage />);
    expect(screen.getByText("Loading...")).toBeTruthy();
  });

  it("shows empty screen when user is set after loading", () => {
    (useAuth as any).mockReturnValue({
      user: { email: "test@example.com" },
      loading: false,
      login: mockLogin,
      guestLogin: mockGuestLogin,
      register: vi.fn(),
      logout: vi.fn(),
    });

    render(<LoginPage />);
    // The authenticated branch renders an empty div — no form
    expect(screen.queryByText("loginTitle")).toBeNull();
  });

  it("shows guest login button only in Tauri and logs in as guest", async () => {
    (isTauri as any).mockReturnValue(true);
    mockGuestLogin.mockResolvedValue(undefined);

    render(<LoginPage />);
    const guestBtn = screen.getByText("guestLogin");
    expect(guestBtn).toBeTruthy();

    fireEvent.click(guestBtn);
    await waitFor(() => {
      expect(mockGuestLogin).toHaveBeenCalled();
    });
    expect(window.location.href).toBe("/app");
  });

  it("shows loginFailed error when guest login fails", async () => {
    (isTauri as any).mockReturnValue(true);
    mockGuestLogin.mockRejectedValue(new Error("fail"));

    render(<LoginPage />);
    fireEvent.click(screen.getByText("guestLogin"));

    await waitFor(() => {
      expect(screen.getByText("loginFailed")).toBeTruthy();
    });
  });

  it("shows loggingIn text while submitting", async () => {
    let resolveLogin: (v: unknown) => void;
    mockLogin.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve;
        }),
    );

    render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText("email@example.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByText("loginButton"));

    expect(screen.getByText("loggingIn")).toBeTruthy();

    await act(async () => {
      resolveLogin!(undefined);
    });
  });

  it("does not submit when email is empty", async () => {
    render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByText("loginButton"));
    expect(mockLogin).not.toHaveBeenCalled();
  });
});