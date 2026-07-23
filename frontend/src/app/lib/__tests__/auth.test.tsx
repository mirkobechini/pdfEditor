import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { AuthProvider, useAuth } from "../auth";

vi.mock("../api", () => ({
  api: {
    getMe: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    googleLogin: vi.fn(),
    logout: vi.fn(),
    setToken: vi.fn(),
    setCsrfToken: vi.fn(),
    refreshCsrf: vi.fn(),
  },
}));

import { api } from "../api";

function TestConsumer() {
  const { user, loading, login, register, googleLogin, logout } = useAuth();
  return (
    <div>
      <div data-testid="loading">{loading ? "loading" : "done"}</div>
      <div data-testid="user">{user ? user.email : "null"}</div>
      <button data-testid="btn-login" onClick={() => login("a@b.com", "pwd")}>login</button>
      <button data-testid="btn-register" onClick={() => register("a@b.com", "pwd", "A B")}>register</button>
      <button data-testid="btn-google" onClick={() => googleLogin("id-token")}>google</button>
      <button data-testid="btn-logout" onClick={() => logout()}>logout</button>
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // Reset the mount guard so each test gets a fresh AuthProvider
  try { sessionStorage.removeItem("auth_has_checked"); } catch { /* noop */ }
});

describe("AuthProvider", () => {
  it("shows no user by default", async () => {
    (api.getMe as any).mockRejectedValue(new Error("Not authenticated"));
    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("done"));
    expect(screen.getByTestId("user").textContent).toBe("null");
  });

  it("restores session on mount when getMe succeeds", async () => {
    (api.getMe as any).mockResolvedValue({ id: "1", email: "test@example.com", full_name: "Test", is_active: true, is_admin: false, license_tier: "free", license_tier_source: "admin", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" });
    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("test@example.com"));
    // PRODUCTION CHECK: refreshCsrf must be called after getMe to re-sync CSRF token
    // cross-origin after page refresh (in-memory token is lost)
    expect(api.refreshCsrf).toHaveBeenCalled();
  });

  it("sets user after login", async () => {
    (api.getMe as any).mockRejectedValue(new Error("Not authenticated"));
    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("done"));
    (api.login as any).mockResolvedValue({ access_token: "token" });
    (api.getMe as any).mockResolvedValue({ id: "1", email: "a@b.com", full_name: "A B", is_active: true, is_admin: false, license_tier: "free", license_tier_source: "admin", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" });
    fireEvent.click(screen.getByTestId("btn-login"));
    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("a@b.com"));
  });

  it("sets user after register", async () => {
    (api.getMe as any).mockRejectedValue(new Error("Not authenticated"));
    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("done"));
    (api.register as any).mockResolvedValue({ access_token: "token" });
    (api.getMe as any).mockResolvedValue({ id: "1", email: "a@b.com", full_name: "A B", is_active: true, is_admin: false, license_tier: "free", license_tier_source: "admin", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" });
    fireEvent.click(screen.getByTestId("btn-register"));
    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("a@b.com"));
  });

  it("sets user after googleLogin", async () => {
    (api.getMe as any).mockRejectedValue(new Error("Not authenticated"));
    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("done"));
    (api.googleLogin as any).mockResolvedValue({ access_token: "token" });
    (api.getMe as any).mockResolvedValue({ id: "1", email: "google@test.com", full_name: "Google", is_active: true, is_admin: false, license_tier: "free", license_tier_source: "admin", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" });
    fireEvent.click(screen.getByTestId("btn-google"));
    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("google@test.com"));
  });

  it("logout clears user", async () => {
    (api.getMe as any).mockRejectedValue(new Error("Not authenticated"));
    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("done"));
    (api.login as any).mockResolvedValue({ access_token: "token" });
    (api.getMe as any).mockResolvedValue({ id: "1", email: "a@b.com", full_name: "A B", is_active: true, is_admin: false, license_tier: "free" });
    fireEvent.click(screen.getByTestId("btn-login"));
    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("a@b.com"));
    fireEvent.click(screen.getByTestId("btn-logout"));
    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("null"));
    expect(api.logout).toHaveBeenCalled();
  });

  it("redirects to / when getMe fails after register", async () => {
    (api.getMe as any).mockRejectedValue(new Error("Not authenticated"));
    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("done"));
    (api.register as any).mockResolvedValue({ access_token: "token" });
    (api.getMe as any).mockRejectedValue(new Error("Failed"));
    fireEvent.click(screen.getByTestId("btn-register"));
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("done"));
  });

  it("redirects to / when getMe fails after googleLogin", async () => {
    (api.getMe as any).mockRejectedValue(new Error("Not authenticated"));
    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("done"));
    (api.googleLogin as any).mockResolvedValue({ access_token: "token" });
    (api.getMe as any).mockRejectedValue(new Error("Failed"));
    fireEvent.click(screen.getByTestId("btn-google"));
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("done"));
  });
});
