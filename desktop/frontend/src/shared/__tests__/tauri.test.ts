import { describe, it, expect } from "vitest";
import { isTauri, getApiBaseUrl, getCloudApiBaseUrl } from "../tauri";

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
});
