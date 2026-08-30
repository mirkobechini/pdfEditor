import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../auth";

const mockGetMe = vi.fn();
const mockGetToken = vi.fn().mockReturnValue(null);
const mockLogin = vi.fn();
const mockLogout = vi.fn();
const mockGuestLogin = vi.fn();
const mockCloudLogin = vi.fn();
const mockCloudGetMe = vi.fn();
const mockCloudRegister = vi.fn();
const mockSetToken = vi.fn();
const mockSetCsrfToken = vi.fn();
const mockRefreshCsrf = vi.fn();
const mockSyncUser = vi.fn();
const mockCloudSetToken = vi.fn();
const mockCloudRefreshCsrf = vi.fn();
const mockCloudGoogleLogin = vi.fn();
const mockTauriInvoke = vi.fn();

let mockIsTauri = false;

vi.mock("../api", () => ({
  api: {
    getMe: (...args: any[]) => mockGetMe(...args),
    login: (...args: any[]) => mockLogin(...args),
    logout: (...args: any[]) => mockLogout(...args),
    guestLogin: (...args: any[]) => mockGuestLogin(...args),
    getToken: () => mockGetToken(),
    setToken: (...args: any[]) => mockSetToken(...args),
    setCsrfToken: (...args: any[]) => mockSetCsrfToken(...args),
    refreshCsrf: (...args: any[]) => mockRefreshCsrf(...args),
    syncUser: (...args: any[]) => mockSyncUser(...args),
    onTokenRefreshed: null as any,
    onTokenRefreshFailed: null as any,
  },
  cloudApi: {
    login: (...args: any[]) => mockCloudLogin(...args),
    getMe: (...args: any[]) => mockCloudGetMe(...args),
    setToken: (...args: any[]) => mockCloudSetToken(...args),
    refreshCsrf: (...args: any[]) => mockCloudRefreshCsrf(...args),
    googleLogin: (...args: any[]) => mockCloudGoogleLogin(...args),
    register: (...args: any[]) => mockCloudRegister(...args),
  },
}));

vi.mock("../tauri", () => ({
  isTauri: () => mockIsTauri,
  tauriInvoke: (...args: any[]) => mockTauriInvoke(...args),
}));

function TestConsumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="user">{auth.user ? auth.user.email : "null"}</span>
      <span data-testid="loading">{auth.loading ? "loading" : "loaded"}</span>
      <span data-testid="offline">{auth.isOffline ? "offline" : "online"}</span>
      <button data-testid="btn-login" onClick={() => auth.login("test@test.com", "pass")}>Login</button>
      <button data-testid="btn-login-remember" onClick={() => auth.login("test@test.com", "pass", true)}>LoginRemember</button>
      <button data-testid="btn-register" onClick={() => auth.register("new@test.com", "pass", "Test")}>Register</button>
      <button data-testid="btn-logout" onClick={() => auth.logout()}>Logout</button>
      <button data-testid="btn-guest" onClick={() => auth.guestLogin()}>Guest</button>
      <button data-testid="btn-google-jwt" onClick={() => auth.googleLogin("eyJhbGciOiJIUzI1NiJ9.dGVzdA.test")}>GoogleJWT</button>
      <button data-testid="btn-google-id" onClick={() => auth.googleLogin("google-id-token")}>GoogleID</button>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockIsTauri = false;
    mockGetToken.mockReturnValue(null);
    mockGetMe.mockResolvedValue({ id: "u1", email: "test@test.com" });
    mockTauriInvoke.mockResolvedValue(null);
  });

  it("renders children and provides context", () => {
    render(<AuthProvider><TestConsumer /></AuthProvider>);
    expect(screen.getByTestId("user")).toHaveTextContent("null");
  });

  it("restores session from localStorage", async () => {
    localStorage.setItem("pdfeditor_remember_token", "stored-token");
    mockGetToken.mockReturnValue("stored-token");

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("test@test.com");
    });
  });

  it("restores session with cloud fallback when local getMe fails", async () => {
    localStorage.setItem("pdfeditor_remember_token", "stored-token");
    mockGetToken.mockReturnValue("stored-token");
    mockGetMe.mockRejectedValueOnce(new Error("sidecar not ready"));
    mockCloudGetMe.mockResolvedValueOnce({ id: "u1", email: "cloud@test.com" });

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("cloud@test.com");
    });
  });

  it("enters offline mode when both local and cloud fail", async () => {
    localStorage.setItem("pdfeditor_remember_token", "stored-token");
    mockGetToken.mockReturnValue("stored-token");
    mockGetMe.mockRejectedValueOnce(new Error("sidecar not ready"));
    mockCloudGetMe.mockRejectedValueOnce(new Error("cloud not reachable"));

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => {
      expect(screen.getByTestId("offline")).toHaveTextContent("offline");
    });
  });

  it("login sets user on success", async () => {
    mockCloudLogin.mockResolvedValueOnce({ access_token: "jwt123" });

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("null"));

    fireEvent.click(screen.getByTestId("btn-login"));
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("test@test.com");
    });
  });

  it("login with remember-me stores token", async () => {
    mockCloudLogin.mockResolvedValueOnce({ access_token: "jwt123" });

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("null"));

    fireEvent.click(screen.getByTestId("btn-login-remember"));
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("test@test.com");
    });
    expect(localStorage.getItem("pdfeditor_remember_token")).toBe("jwt123");
  });

  it("register sets user on success", async () => {
    mockCloudRegister.mockResolvedValueOnce({ access_token: "jwt123" });
    mockGetMe.mockResolvedValueOnce({ id: "u1", email: "new@test.com" });

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("null"));

    fireEvent.click(screen.getByTestId("btn-register"));
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("new@test.com");
    });
  });

  it("register falls back to cloudApi.getMe when api.getMe fails", async () => {
    mockCloudRegister.mockResolvedValueOnce({ access_token: "jwt123" });
    mockGetMe.mockRejectedValueOnce(new Error("sidecar error"));
    mockCloudGetMe.mockResolvedValueOnce({ id: "u1", email: "cloud-user@test.com" });

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("null"));

    fireEvent.click(screen.getByTestId("btn-register"));
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("cloud-user@test.com");
    });
  });

  it("logout clears user", async () => {
    mockLogout.mockResolvedValueOnce(undefined);
    mockGetToken.mockReturnValue("token123");

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("test@test.com"));

    fireEvent.click(screen.getByTestId("btn-logout"));
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("null");
    });
  });

  it("guestLogin sets guest user", async () => {
    mockGuestLogin.mockResolvedValueOnce({ access_token: "guest-jwt" });

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("null"));

    fireEvent.click(screen.getByTestId("btn-guest"));
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("test@test.com");
    });
  });

  it("guestLogin redirects on error", async () => {
    mockGuestLogin.mockResolvedValueOnce({ access_token: "guest-jwt" });
    mockGetMe.mockRejectedValueOnce(new Error("sidecar error"));
    const originalHref = window.location.href;
    // Prevent actual navigation
    Object.defineProperty(window, "location", {
      value: { href: originalHref },
      writable: true,
    });

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("null"));

    fireEvent.click(screen.getByTestId("btn-guest"));
    await waitFor(() => {
      expect(window.location.href).toBe("/");
    });
  });

  it("useAuth throws outside provider", () => {
    // Suppress console.error for expected error
    const spy = vi.spyOn(console, "error").mockImplementation(() => { });
    expect(() => render(<TestConsumer />)).toThrow("useAuth must be used within an AuthProvider");
    spy.mockRestore();
  });

  it("googleLogin with JWT token (eyJ prefix) in web mode", async () => {
    mockGetMe.mockResolvedValueOnce({ id: "u1", email: "google-jwt@test.com" });

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("null"));

    fireEvent.click(screen.getByTestId("btn-google-jwt"));
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("google-jwt@test.com");
    });
  });

  it("googleLogin with JWT handles api.getMe failure", async () => {
    mockGetMe.mockRejectedValueOnce(new Error("sidecar error"));
    mockCloudGetMe.mockResolvedValueOnce({ id: "u1", email: "google-cloud@test.com" });

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("null"));

    fireEvent.click(screen.getByTestId("btn-google-jwt"));
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("google-cloud@test.com");
    });
    // The user must be synced to the sidecar so local listPdfs works
    expect(mockSyncUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: "google-cloud@test.com" }),
    );
  });

  it("googleLogin with id_token exchanges via cloud API", async () => {
    mockCloudGoogleLogin.mockResolvedValueOnce({ access_token: "exchanged-jwt" });
    mockGetMe.mockResolvedValueOnce({ id: "u1", email: "google-id@test.com" });

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("null"));

    fireEvent.click(screen.getByTestId("btn-google-id"));
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("google-id@test.com");
    });
    expect(mockCloudGoogleLogin).toHaveBeenCalledWith("google-id-token");
  });

  it("googleLogin with id_token handles api.getMe failure", async () => {
    mockCloudGoogleLogin.mockResolvedValueOnce({ access_token: "exchanged-jwt" });
    mockGetMe.mockRejectedValueOnce(new Error("sidecar error"));
    mockCloudGetMe.mockResolvedValueOnce({ id: "u1", email: "google-cloud-id@test.com" });

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("null"));

    fireEvent.click(screen.getByTestId("btn-google-id"));
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("google-cloud-id@test.com");
    });
  });
});
