import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PreferencesProvider } from "../preferences";

// Mock api
vi.mock("../../shared/api", () => ({
    api: {
        getPreferences: vi.fn().mockResolvedValue({
            theme: "dark",
            language: "it",
            default_zoom: 100,
            antialiasing: true,
            density: "comfortable",
        }),
        setPreferences: vi.fn().mockResolvedValue(undefined),
    },
}));

describe("PreferencesProvider", () => {
    it("renders children", () => {
        render(
            <PreferencesProvider>
                <div>Test Child</div>
            </PreferencesProvider>
        );
        expect(screen.getByText("Test Child")).toBeInTheDocument();
    });
});