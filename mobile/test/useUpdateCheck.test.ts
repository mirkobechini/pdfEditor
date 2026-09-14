/**
 * Tests for useUpdateCheck hook — version comparison logic.
 */
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock("expo-constants", () => ({
  expoConfig: { version: "0.2.1" },
}));

import { isNewerVersion } from "../src/hooks/useUpdateCheck";

describe("isNewerVersion", () => {
  it("returns true when a is newer than b", () => {
    expect(isNewerVersion("0.2.2", "0.2.1")).toBe(true);
    expect(isNewerVersion("0.3.0", "0.2.9")).toBe(true);
    expect(isNewerVersion("1.0.0", "0.9.9")).toBe(true);
  });

  it("returns false when a is older or equal", () => {
    expect(isNewerVersion("0.2.1", "0.2.1")).toBe(false);
    expect(isNewerVersion("0.2.0", "0.2.1")).toBe(false);
    expect(isNewerVersion("0.1.9", "0.2.0")).toBe(false);
  });

  it("handles v prefix", () => {
    expect(isNewerVersion("v0.2.2", "0.2.1")).toBe(true);
    expect(isNewerVersion("v0.2.1", "v0.2.1")).toBe(false);
  });

  it("handles missing segments as zero", () => {
    expect(isNewerVersion("0.2", "0.2.1")).toBe(false);
    expect(isNewerVersion("0.2.1", "0.2")).toBe(true);
  });
});