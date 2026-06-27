import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

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
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock the old useI18n for any remaining references
vi.mock("../lib/i18n", () => ({
  useLocaleControl: () => ({ locale: "en" as const, setLocale: vi.fn() }),
}));