import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import React from "react";

// Suppress React act() warnings — they're informational, not bugs.
// These warnings appear when async state updates happen outside act() wrappers,
// which is common in tests with multiple async operations. The tests are still valid.
const originalError = console.error;
console.error = (...args: unknown[]) => {
  if (typeof args[0] === "string" && args[0].includes("not wrapped in act"))
    return;
  originalError.call(console, ...args);
};

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock next-intl hooks globally for all tests
vi.mock("next-intl", () => ({
  useTranslations: () => {
    const cache: Record<string, string> = {};
    return (key: string) => {
      if (!cache[key]) {
        // Return a readable mock value
        cache[key] = key;
      }
      return cache[key];
    };
  },
  useLocale: () => "en",
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

// Mock useLocaleSetter
vi.mock("../lib/i18n", () => ({
  useLocaleSetter: () => vi.fn(),
}));

// Mock next/image component for tests
vi.mock("next/image", () => ({
  default: (props: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fill, unoptimized, ...imgProps } = props;
    return React.createElement("img", imgProps);
  },
}));
