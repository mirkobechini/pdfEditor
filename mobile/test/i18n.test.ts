/**
 * Tests for i18n configuration — getSystemLanguage and supported languages.
 *
 * Uses jest.isolateModulesAsync because getLocales() is called at module import time.
 */

// Mock expo-localization
jest.mock("expo-localization", () => ({
  getLocales: jest.fn(),
}));

describe("i18n configuration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 'en' when system locale is English", async () => {
    await jest.isolateModulesAsync(async () => {
      const { getLocales } = require("expo-localization");
      getLocales.mockReturnValue([{ languageCode: "en" }]);

      const { getSystemLanguage } = require("../src/i18n/index");
      expect(getSystemLanguage()).toBe("en");
    });
  });

  it("returns 'it' when system locale is Italian", async () => {
    await jest.isolateModulesAsync(async () => {
      const { getLocales } = require("expo-localization");
      getLocales.mockReturnValue([{ languageCode: "it" }]);

      const { getSystemLanguage } = require("../src/i18n/index");
      expect(getSystemLanguage()).toBe("it");
    });
  });

  it("falls back to 'en' for unsupported locale", async () => {
    await jest.isolateModulesAsync(async () => {
      const { getLocales } = require("expo-localization");
      getLocales.mockReturnValue([{ languageCode: "fr" }]);

      const { getSystemLanguage } = require("../src/i18n/index");
      expect(getSystemLanguage()).toBe("en");
    });
  });

  it("falls back to 'en' when no locales available", async () => {
    await jest.isolateModulesAsync(async () => {
      const { getLocales } = require("expo-localization");
      getLocales.mockReturnValue([]);

      const { getSystemLanguage } = require("../src/i18n/index");
      expect(getSystemLanguage()).toBe("en");
    });
  });

  it("supportedLanguages contains en and it", () => {
    expect.assertions(2);
    // supportedLanguages is a const export, no module isolation needed
    const { supportedLanguages } = require("../src/i18n/index");
    expect(supportedLanguages).toContain("en");
    expect(supportedLanguages).toContain("it");
  });
});
