import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";

describe("useOfflineAuth", () => {
  beforeEach(() => {
    // Mock navigator.onLine
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    delete (window as any).__TAURI__;
  });

  it("returns isDesktop=false when not in Tauri", async () => {
    const { useOfflineAuth } = await import("./useOfflineAuth");
    const { result } = renderHook(() => useOfflineAuth());
    expect(result.current.isDesktop).toBe(false);
  });

  it("returns isDesktop=true when in Tauri", async () => {
    (window as any).__TAURI__ = { invoke: async () => "stored-token" };
    const { useOfflineAuth } = await import("./useOfflineAuth");
    const { result } = renderHook(() => useOfflineAuth());
    // isDesktop reads isTauri() synchronously
    expect(result.current.isDesktop).toBe(true);
  });

  it("starts online when navigator.onLine is true", async () => {
    const { useOfflineAuth } = await import("./useOfflineAuth");
    const { result } = renderHook(() => useOfflineAuth());
    expect(result.current.isOnline).toBe(true);
  });

  it("detects offline events", async () => {
    (window as any).__TAURI__ = { invoke: async () => null };
    const { useOfflineAuth } = await import("./useOfflineAuth");
    const { result } = renderHook(() => useOfflineAuth());

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(result.current.isOnline).toBe(false);
  });

  it("detects online events", async () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });
    (window as any).__TAURI__ = { invoke: async () => null };
    const { useOfflineAuth } = await import("./useOfflineAuth");
    const { result } = renderHook(() => useOfflineAuth());

    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(result.current.isOnline).toBe(true);
  });
});

describe("saveOfflineToken / loadOfflineToken / deleteOfflineToken", () => {
  afterEach(() => {
    delete (window as any).__TAURI__;
  });

  it("saveOfflineToken returns false when not in Tauri", async () => {
    const { saveOfflineToken } = await import("./useOfflineAuth");
    const result = await saveOfflineToken("test-token");
    expect(result).toBe(false);
  });

  it("loadOfflineToken returns null when not in Tauri", async () => {
    const { loadOfflineToken } = await import("./useOfflineAuth");
    const result = await loadOfflineToken();
    expect(result).toBeNull();
  });

  it("deleteOfflineToken does not throw when not in Tauri", async () => {
    const { deleteOfflineToken } = await import("./useOfflineAuth");
    await expect(deleteOfflineToken()).resolves.toBeUndefined();
  });

  it("saveOfflineToken calls tauriInvoke with store_jwt", async () => {
    const mockInvoke = vi.fn(async () => null);
    (window as any).__TAURI__ = { invoke: mockInvoke };
    const { saveOfflineToken } = await import("./useOfflineAuth");
    await saveOfflineToken("test-token");
    expect(mockInvoke).toHaveBeenCalledWith("store_jwt", {
      token: "test-token",
    });
    delete (window as any).__TAURI__;
  });

  it("loadOfflineToken calls tauriInvoke with load_jwt", async () => {
    const mockInvoke = vi.fn(async () => "stored-token");
    (window as any).__TAURI__ = { invoke: mockInvoke };
    const { loadOfflineToken } = await import("./useOfflineAuth");
    const result = await loadOfflineToken();
    expect(mockInvoke).toHaveBeenCalledWith("load_jwt", undefined);
    expect(result).toBe("stored-token");
    delete (window as any).__TAURI__;
  });
});
