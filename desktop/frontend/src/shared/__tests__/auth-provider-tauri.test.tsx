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
  isTauri: () => true,
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
    </div>
  );
}

describe("AuthProvider (Tauri/Desktop)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockGetToken.mockReturnValue(null);
    mockGetMe.mockResolvedValue({ id: "u1", email: "test@test.com" });
    mockTauriInvoke.mockResolvedValue(null);
  });

  it("restores session from Tauri store", async () => {
    mockGetToken.mockReturnValue("stored-token");
    mockTauriInvoke.mockImplementation((cmd: string) => {
      if (cmd === "load_jwt") return Promise.resolve("tauri-token");
      return Promise.resolve(null);
    });

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("test@test.com");
    });
  });

  it("login with local SQLite first (Tauri)", async () => {
    mockLogin.mockResolvedValueOnce({ access_token: "local-jwt" });

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("null"));

    fireEvent.click(screen.getByTestId("btn-login"));
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("test@test.com");
    });
    expect(mockLogin).toHaveBeenCalledWith("test@test.com", "pass");
  });

  it("login falls back to cloud when local fails (Tauri)", async () => {
    mockLogin.mockRejectedValueOnce(new Error("not in local SQLite"));
    mockCloudLogin.mockResolvedValueOnce({ access_token: "cloud-jwt" });
    mockCloudGetMe.mockResolvedValueOnce({ id: "u1", email: "cloud-user@test.com" });
    mockSyncUser.mockResolvedValueOnce({ access_token: "synced-jwt", csrf_token: "csrf123" });
    // After sync, login calls api.getMe() which returns the beforeEach mock
    mockGetMe.mockResolvedValue({ id: "u1", email: "cloud-user@test.com" });

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("null"));

    fireEvent.click(screen.getByTestId("btn-login"));
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("cloud-user@test.com");
    });
    expect(mockCloudLogin).toHaveBeenCalledWith("test@test.com", "pass");
    expect(mockSyncUser).toHaveBeenCalled();
  });

  it("login with remember-me stores token via Tauri store", async () => {
    mockLogin.mockResolvedValueOnce({ access_token: "local-jwt" });
    mockTauriInvoke.mockResolvedValue(undefined);

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("null"));

    fireEvent.click(screen.getByTestId("btn-login-remember"));
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("test@test.com");
    });
    expect(mockTauriInvoke).toHaveBeenCalledWith("store_jwt", { token: "local-jwt" });
  });

  it("register syncs user to local SQLite (Tauri)", async () => {
    mockCloudRegister.mockResolvedValueOnce({ access_token: "jwt123" });
    mockCloudGetMe.mockResolvedValueOnce({ id: "u1", email: "new@test.com" });
    mockGetMe.mockResolvedValueOnce({ id: "u1", email: "new@test.com" });

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("null"));

    fireEvent.click(screen.getByTestId("btn-register"));
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("new@test.com");
    });
    expect(mockSyncUser).toHaveBeenCalled();
  });

  it("login with local success also tries cloud login", async () => {
    mockLogin.mockResolvedValueOnce({ access_token: "local-jwt" });
    mockCloudLogin.mockResolvedValueOnce({ access_token: "cloud-jwt" });

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("null"));

    fireEvent.click(screen.getByTestId("btn-login"));
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("test@test.com");
    });
    // Should have tried cloud login too
    expect(mockCloudLogin).toHaveBeenCalledWith("test@test.com", "pass");
  });

  it("login with local success handles cloud login failure gracefully", async () => {
    mockLogin.mockResolvedValueOnce({ access_token: "local-jwt" });
    mockCloudLogin.mockRejectedValueOnce(new Error("cloud not available"));

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("null"));

    fireEvent.click(screen.getByTestId("btn-login"));
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("test@test.com");
    });
  });

  it("login cloud fallback handles syncUser returning null", async () => {
    mockLogin.mockRejectedValueOnce(new Error("not in local SQLite"));
    mockCloudLogin.mockResolvedValueOnce({ access_token: "cloud-jwt" });
    mockCloudGetMe.mockResolvedValueOnce({ id: "u1", email: "cloud-user@test.com" });
    mockSyncUser.mockResolvedValueOnce(null);
    mockGetMe.mockResolvedValue({ id: "u1", email: "cloud-user@test.com" });

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("null"));

    fireEvent.click(screen.getByTestId("btn-login"));
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("cloud-user@test.com");
    });
  });

  it("logout clears Tauri store", async () => {
    mockLogout.mockResolvedValueOnce(undefined);
    mockGetToken.mockReturnValue("token123");

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("test@test.com"));

    fireEvent.click(screen.getByTestId("btn-logout"));
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("null");
    });
    expect(mockTauriInvoke).toHaveBeenCalledWith("delete_jwt");
  });

  it("googleLogin with JWT token (eyJ prefix) in Tauri", async () => {
    mockGetMe.mockResolvedValueOnce({ id: "u1", email: "google@test.com" });

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("null"));

    fireEvent.click(screen.getByTestId("btn-google-jwt"));
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("google@test.com");
    });
    expect(mockTauriInvoke).toHaveBeenCalledWith("store_jwt", { token: "eyJhbGciOiJIUzI1NiJ9.dGVzdA.test" });
  });

  it("googleLogin uses syncResult local token when api.getMe fails (download 403 fix)", async () => {
    // api.getMe (sidecar) fails with the cloud JWT → 401
    mockGetMe.mockRejectedValueOnce(new Error("401"));
    // cloudApi.getMe works
    mockCloudGetMe.mockResolvedValueOnce({ id: "u1", email: "google@test.com" });
    // syncUser returns the LOCAL sidecar token
    mockSyncUser.mockResolvedValueOnce({ access_token: "local-sidecar-jwt", csrf_token: "local-csrf" });
    mockTauriInvoke.mockResolvedValue(undefined);

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("null"));

    fireEvent.click(screen.getByTestId("btn-google-jwt"));
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("google@test.com");
    });

    // syncUser must be called
    expect(mockSyncUser).toHaveBeenCalled();
    // api.setToken must be called with the LOCAL sidecar token (not the cloud JWT)
    expect(mockSetToken).toHaveBeenCalledWith("local-sidecar-jwt");
    // api.setCsrfToken must be called with the local CSRF
    expect(mockSetCsrfToken).toHaveBeenCalledWith("local-csrf");
    // The LOCAL token must be persisted to Tauri store (not the cloud one)
    expect(mockTauriInvoke).toHaveBeenCalledWith("store_jwt", { token: "local-sidecar-jwt" });
  });
});
