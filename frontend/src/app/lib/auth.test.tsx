import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { AuthProvider, useAuth } from "./auth";

// Mock api.getMe and other api methods
vi.mock("./api", () => ({
  api: {
    getMe: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    setToken: vi.fn(),
  },
}));

import { api } from "./api";

function TestConsumer() {
  const { user, loading, login, register, logout, token } = useAuth();
  return (
    <div>
      <div data-testid="loading">{loading ? "loading" : "done"}</div>
      <div data-testid="user">{user ? user.email : "null"}</div>
      <div data-testid="token">{token ?? "null"}</div>
      <button data-testid="btn-login" onClick={() => login("a@b.com", "pwd")}>
        login
      </button>
      <button data-testid="btn-register" onClick={() => register("a@b.com", "pwd", "A B")}>
        register
      </button>
      <button data-testid="btn-logout" onClick={() => logout()}>
        logout
      </button>
    </div>
  );
}

// Mock localStorage
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

beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
});

describe("AuthProvider", () => {
  it("shows no user when no token stored", async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("done");
    });
    expect(screen.getByTestId("user").textContent).toBe("null");
    expect(screen.getByTestId("token").textContent).toBe("null");
  });

  it("restores token from localStorage and validates with getMe", async () => {
    localStorageMock.setItem("pdfeditor_token", "valid-token");
    (api.getMe as any).mockResolvedValue({
      id: "1",
      email: "test@example.com",
      full_name: "Test User",
      is_active: true,
      is_admin: false,
      license_tier: "free",
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("test@example.com");
    });
    expect(screen.getByTestId("token").textContent).toBe("valid-token");
  });

  it("clears invalid token on getMe failure", async () => {
    localStorageMock.setItem("pdfeditor_token", "invalid-token");
    (api.getMe as any).mockRejectedValue(new Error("Unauthorized"));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("null");
    });
    expect(screen.getByTestId("token").textContent).toBe("null");
    expect(localStorageMock.getItem("pdfeditor_token")).toBeNull();
  });

  it("login sets user and token", async () => {
    (api.login as any).mockResolvedValue({ access_token: "new-token" });
    (api.getMe as any).mockResolvedValue({
      id: "1",
      email: "a@b.com",
      full_name: "A B",
      is_active: true,
      is_admin: false,
      license_tier: "free",
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("done"));

    fireEvent.click(screen.getByTestId("btn-login"));

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("a@b.com");
    });
    expect(screen.getByTestId("token").textContent).toBe("new-token");
  });

  it("logout clears user and token", async () => {
    localStorageMock.setItem("pdfeditor_token", "valid-token");
    (api.getMe as any).mockResolvedValue({
      id: "1",
      email: "test@example.com",
      full_name: "Test User",
      is_active: true,
      is_admin: false,
      license_tier: "free",
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("test@example.com");
    });

    fireEvent.click(screen.getByTestId("btn-logout"));

    expect(screen.getByTestId("user").textContent).toBe("null");
    expect(screen.getByTestId("token").textContent).toBe("null");
  });

  it("throws error when useAuth is used outside AuthProvider", () => {
    expect(() => render(<TestConsumer />)).toThrow(
      "useAuth must be used within an AuthProvider"
    );
  });
});