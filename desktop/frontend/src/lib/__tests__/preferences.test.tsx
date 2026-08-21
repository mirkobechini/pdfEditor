import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { PreferencesProvider, usePreferences } from "../preferences";

const mockGetPreferences = vi.fn();
const mockSetPreferences = vi.fn();

vi.mock("../../shared/api", () => ({
    api: {
        getPreferences: (...args: any[]) => mockGetPreferences(...args),
        setPreferences: (...args: any[]) => mockSetPreferences(...args),
    },
}));

function TestConsumer() {
    const { prefs } = usePreferences();
    return <div data-testid="prefs">{prefs.language}-{prefs.theme}</div>;
}

function TestUpdater() {
    const { updatePrefs } = usePreferences();
    return <button data-testid="update" onClick={() => updatePrefs({ language: "en" })}>Update</button>;
}

describe("PreferencesProvider", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetPreferences.mockResolvedValue({
            theme: "dark",
            language: "it",
            default_zoom: 100,
            antialiasing: true,
            density: "comfortable",
        });
    });

    it("renders children", () => {
        render(
            <PreferencesProvider>
                <div>Test Child</div>
            </PreferencesProvider>
        );
        expect(screen.getByText("Test Child")).toBeInTheDocument();
    });

    it("loads preferences from api on mount", async () => {
        render(
            <PreferencesProvider>
                <TestConsumer />
            </PreferencesProvider>
        );
        expect(mockGetPreferences).toHaveBeenCalled();
    });

    it("provides default preferences when api fails", async () => {
        mockGetPreferences.mockRejectedValueOnce(new Error("Network error"));
        render(
            <PreferencesProvider>
                <TestConsumer />
            </PreferencesProvider>
        );
        await act(async () => { });
        expect(screen.getByTestId("prefs")).toHaveTextContent("it-dark");
    });

    it("throws when usePreferences is used outside provider", () => {
        expect(() => render(<TestConsumer />)).toThrow();
    });
});