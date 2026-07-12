import { describe, it, expect, vi } from "vitest";
import { downloadBlob } from "../download";

describe("downloadBlob", () => {
  it("creates and clicks a download link", () => {
    const clickFn = vi.fn();
    URL.createObjectURL = vi.fn(() => "blob:test");
    URL.revokeObjectURL = vi.fn();

    const mockLink = { click: clickFn, href: "", download: "" };
    document.createElement = vi.fn(() => mockLink) as any;
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();

    const blob = new Blob(["test"], { type: "application/pdf" });
    downloadBlob(blob, "test.pdf");

    expect(clickFn).toHaveBeenCalled();
    expect(mockLink.download).toBe("test.pdf");
  });
});
