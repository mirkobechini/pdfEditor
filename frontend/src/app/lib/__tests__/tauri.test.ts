import { describe, it, expect } from "vitest";

// We can't test __TAURI__ detection in jsdom (no Tauri runtime),
// but we can test the pure logic of the utility functions.

describe("tauri utilities (unit)", () => {
  it("isTauri returns false in browser (jsdom) environment", async () => {
    const { isTauri } = await import("../tauri");
    expect(isTauri()).toBe(false);
  });

  it("getApiBaseUrl returns env variable or fallback in browser", async () => {
    const { getApiBaseUrl } = await import("../tauri");
    const url = getApiBaseUrl();
    // In test (no NEXT_PUBLIC_API_URL set), should fallback to localhost:8000
    expect(url).toMatch(/^http:\/\/localhost/);
  });

  it("getApiBaseUrl returns 127.0.0.1:7723 when __TAURI__ is set", async () => {
    // Simulate Tauri environment
    (window as any).__TAURI__ = { invoke: async () => 7723 };
    const { getApiBaseUrl, isTauri } = await import("../tauri");
    expect(isTauri()).toBe(true);
    expect(getApiBaseUrl()).toBe("http://127.0.0.1:7723");
    delete (window as any).__TAURI__;
  });

  it("tauriInvoke returns null when not in Tauri", async () => {
    const { tauriInvoke } = await import("../tauri");
    const result = await tauriInvoke("test_cmd");
    expect(result).toBeNull();
  });

  it("openPdfDialog returns null when not in Tauri", async () => {
    const { openPdfDialog } = await import("../tauri");
    const result = await openPdfDialog();
    expect(result).toBeNull();
  });

  it("saveFileDialog returns null when not in Tauri", async () => {
    const { saveFileDialog } = await import("../tauri");
    const result = await saveFileDialog("test.pdf");
    expect(result).toBeNull();
  });

  it("getSidecarPort returns fallback 7723 when not in Tauri", async () => {
    const { getSidecarPort } = await import("../tauri");
    const port = await getSidecarPort();
    expect(port).toBe(7723);
  });

  it("tauriInvoke calls window.__TAURI__.invoke with correct args", async () => {
    const mockInvoke = async (cmd: string, args?: Record<string, unknown>) => {
      return `called: ${cmd} with ${JSON.stringify(args)}`;
    };
    (window as any).__TAURI__ = { invoke: mockInvoke };
    const { tauriInvoke } = await import("../tauri");
    const result = await tauriInvoke("store_jwt", { token: "abc" });
    expect(result).toContain("store_jwt");
    delete (window as any).__TAURI__;
  });

  it("tauriInvoke uses core.invoke as fallback", async () => {
    const mockInvoke = async (cmd: string) => `core: ${cmd}`;
    (window as any).__TAURI__ = {
      core: { invoke: mockInvoke },
    };
    const { tauriInvoke } = await import("../tauri");
    const result = await tauriInvoke("test");
    expect(result).toContain("core: test");
    delete (window as any).__TAURI__;
  });

  it("tauriInvoke returns null on error", async () => {
    (window as any).__TAURI__ = {
      invoke: async () => {
        throw new Error("fail");
      },
    };
    const { tauriInvoke } = await import("../tauri");
    const result = await tauriInvoke("failing_cmd");
    expect(result).toBeNull();
    delete (window as any).__TAURI__;
  });

  it("openPdfDialog returns path when Tauri dialog succeeds", async () => {
    (window as any).__TAURI__ = {
      invoke: async (cmd: string) => {
        if (cmd === "plugin:dialog|open") return { path: "/test/file.pdf" };
        return null;
      },
    };
    const { openPdfDialog } = await import("../tauri");
    const result = await openPdfDialog();
    expect(result).toBe("/test/file.pdf");
    delete (window as any).__TAURI__;
  });

  it("openPdfDialog returns null when dialog returns no path", async () => {
    (window as any).__TAURI__ = {
      invoke: async () => null,
    };
    const { openPdfDialog } = await import("../tauri");
    const result = await openPdfDialog();
    expect(result).toBeNull();
    delete (window as any).__TAURI__;
  });

  it("saveFileDialog returns path when Tauri save succeeds", async () => {
    (window as any).__TAURI__ = {
      invoke: async (cmd: string) => {
        if (cmd === "plugin:dialog|save") return { path: "/test/saved.pdf" };
        return null;
      },
    };
    const { saveFileDialog } = await import("../tauri");
    const result = await saveFileDialog("out.pdf");
    expect(result).toBe("/test/saved.pdf");
    delete (window as any).__TAURI__;
  });

  it("saveFileDialog returns null when dialog returns no path", async () => {
    (window as any).__TAURI__ = {
      invoke: async () => null,
    };
    const { saveFileDialog } = await import("../tauri");
    const result = await saveFileDialog("out.pdf");
    expect(result).toBeNull();
    delete (window as any).__TAURI__;
  });

  it("getSidecarPort returns port from Tauri invoke", async () => {
    (window as any).__TAURI__ = {
      invoke: async () => 8123,
    };
    const { getSidecarPort } = await import("../tauri");
    const port = await getSidecarPort();
    expect(port).toBe(8123);
    delete (window as any).__TAURI__;
  });

  it("getSidecarPort returns fallback when invoke returns null", async () => {
    (window as any).__TAURI__ = {
      invoke: async () => null,
    };
    const { getSidecarPort } = await import("../tauri");
    const port = await getSidecarPort();
    expect(port).toBe(7723);
    delete (window as any).__TAURI__;
  });
});
