import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

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

// Mock the old useI18n for any remaining references
vi.mock("../lib/i18n", () => ({
  useLocaleControl: () => ({ locale: "en" as const, setLocale: vi.fn() }),
}));
