/**
 * Tests for App.tsx — font loading.
 * Verifies that MaterialCommunityIcons font is loaded before render.
 */
import React from "react";
import { useFonts } from "expo-font";

jest.mock("expo-font", () => ({
    useFonts: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
    MaterialCommunityIcons: { font: "MaterialCommunityIcons.ttf" },
}));

jest.mock("../src/shared/auth", () => ({
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("../src/shared/AppSettingsContext", () => ({
    AppSettingsProvider: ({ children }: { children: React.ReactNode }) => children,
    useAppSettings: () => ({ theme: {} }),
}));
jest.mock("../src/shared/OnboardingContext", () => ({
    OnboardingProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("../src/navigation/AppNavigator", () => () => null);
jest.mock("../src/i18n", () => ({}));

import App from "../App";

describe("App font loading", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("loads MaterialCommunityIcons font via useFonts", () => {
        (useFonts as jest.Mock).mockReturnValue([true]);
        App();
        expect(useFonts).toHaveBeenCalledWith({
            MaterialCommunityIcons: "MaterialCommunityIcons.ttf",
        });
    });

    it("returns null (splash) while fonts are loading", () => {
        (useFonts as jest.Mock).mockReturnValue([false]);
        const result = App();
        expect(result).toBeNull();
    });
});