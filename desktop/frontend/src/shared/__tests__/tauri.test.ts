import { describe, it, expect, vi } from "vitest";
import {
  isTauri,
  getApiBaseUrl,
  getCloudApiBaseUrl,
  tauriInvoke,
  openDevTools,
} from "../tauri";

describe("tauri utilities", () => {
  it("isTauri returns false in browser (non-Tauri) environment", () => {
    expect(isTauri()).toBe(false);
  });

  it("getApiBaseUrl returns localhost:7723", () => {
    expect(getApiBaseUrl()).toBe("http://127.0.0.1:7723");
  });

  it("getCloudApiBaseUrl returns Render URL", () => {
    expect(getCloudApiBaseUrl()).toBe("https://pdfeditor-api.mirkobechini.com");
  });

  it("tauriInvoke returns null when not in Tauri", async () => {
    const result = await tauriInvoke("test_cmd");
    expect(result).toBeNull();
  });

  it("tauriInvoke returns result when __TAURI_INTERNALS__ is available", async () => {
    const mockInvoke = vi.fn().mockResolvedValue("result");
    (window as any).__TAURI_INTERNALS__ = { invoke: mockInvoke };
    const result = await tauriInvoke("test_cmd", { arg: "val" });
    expect(result).toBe("result");
    expect(mockInvoke).toHaveBeenCalledWith("test_cmd", { arg: "val" });
    delete (window as any).__TAURI_INTERNALS__;
  });

  it("tauriInvoke returns null on error", async () => {
    const mockInvoke = vi.fn().mockRejectedValue(new Error("error"));
    (window as any).__TAURI_INTERNALS__ = { invoke: mockInvoke };
    const result = await tauriInvoke("test_cmd");
    expect(result).toBeNull();
    delete (window as any).__TAURI_INTERNALS__;
  });

  it("isTauri returns true when __TAURI_INTERNALS__ is available", () => {
    (window as any).__TAURI_INTERNALS__ = { invoke: vi.fn() };
    expect(isTauri()).toBe(true);
    delete (window as any).__TAURI_INTERNALS__;
  });

  it("openDevTools invokes open_devtools command", async () => {
    const mockInvoke = vi.fn().mockResolvedValue(undefined);
    (window as any).__TAURI_INTERNALS__ = { invoke: mockInvoke };
    await openDevTools();
    expect(mockInvoke).toHaveBeenCalledWith("open_devtools", undefined);
    delete (window as any).__TAURI_INTERNALS__;
  });
});
