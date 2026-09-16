/**
 * Tests for App.tsx — font loading.
 * Verifies that MaterialCommunityIcons font is loaded before render.
 */
import React from "react";
import { useFonts } from "expo-font";
import renderer, { act } from "react-test-renderer";

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
jest.mock("../src/hooks/CloudSyncContext", () => ({
    CloudSyncProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("../src/navigation/AppNavigator", () => () => null);
jest.mock("../src/i18n", () => ({}));
jest.mock("../src/hooks/useUpdateCheck", () => ({
    useUpdateCheck: () => ({
        updateAvailable: false,
        latestVersion: "",
        dismissUpdate: jest.fn(),
    }),
}));
jest.mock("../src/components/UpdateDialog", () => () => null);

import App from "../App";

describe("App font loading", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it("loads MaterialCommunityIcons font via useFonts", () => {
        // Use [false] so App returns null (splash) and doesn't render the full
        // content tree (which would require more mocks). We only assert that
        // useFonts is called with the correct font.
        (useFonts as jest.Mock).mockReturnValue([false]);
        act(() => {
            renderer.create(<App />);
        });
        expect(useFonts).toHaveBeenCalledWith({
            MaterialCommunityIcons: "MaterialCommunityIcons.ttf",
        });
    });

    it("returns null (splash) while fonts are loading", () => {
        (useFonts as jest.Mock).mockReturnValue([false]);
        let tree: React.ReactElement | null = null;
        act(() => {
            tree = renderer.create(<App />).toJSON() as unknown as React.ReactElement | null;
        });
        expect(tree).toBeNull();
    });
});