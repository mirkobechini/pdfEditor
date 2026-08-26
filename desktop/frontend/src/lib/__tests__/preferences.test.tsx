import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { PreferencesProvider, usePreferences } from "../preferences";

const mockGetPreferences = vi.fn();
const mockUpdatePreferences = vi.fn().mockResolvedValue({});

vi.mock("../../shared/api", () => ({
    api: {
        getPreferences: (...args: any[]) => mockGetPreferences(...args),
        updatePreferences: (...args: any[]) => mockUpdatePreferences(...args),
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

    it("calls updatePrefs and persists to backend", async () => {
        render(
            <PreferencesProvider>
                <TestUpdater />
                <TestConsumer />
            </PreferencesProvider>
        );
        await act(async () => { });
        const btn = screen.getByTestId("update");
        btn.click();
        expect(mockUpdatePreferences).toHaveBeenCalledWith({ language: "en" });
    });

    it("handles updatePrefs backend failure gracefully", async () => {
        mockUpdatePreferences.mockRejectedValueOnce(new Error("Save failed"));
        render(
            <PreferencesProvider>
                <TestUpdater />
                <TestConsumer />
            </PreferencesProvider>
        );
        await act(async () => { });
        const btn = screen.getByTestId("update");
        btn.click();
        await act(async () => { });
        // Should not throw — fire-and-forget, prefs updated locally
        expect(screen.getByTestId("prefs")).toHaveTextContent("en-dark");
    });

    it("reloads preferences from backend", async () => {
        mockGetPreferences
            .mockResolvedValueOnce({ theme: "dark", language: "it", default_zoom: 100, antialiasing: true, density: "comfortable" })
            .mockResolvedValueOnce({ theme: "light", language: "en", default_zoom: 150, antialiasing: false, density: "compact" });
        function TestReloader() {
            const { reload } = usePreferences();
            return <button data-testid="reload" onClick={() => reload()}>Reload</button>;
        }
        render(
            <PreferencesProvider>
                <TestReloader />
                <TestConsumer />
            </PreferencesProvider>
        );
        await act(async () => { });
        // Initial load is "it-dark"
        expect(screen.getByTestId("prefs")).toHaveTextContent("it-dark");
        // Reload
        screen.getByTestId("reload").click();
        await act(async () => { });
        await waitFor(() => {
            expect(screen.getByTestId("prefs")).toHaveTextContent("en-light");
        });
    });

    it("handles reload backend failure gracefully", async () => {
        mockGetPreferences
            .mockResolvedValueOnce({ theme: "dark", language: "it", default_zoom: 100, antialiasing: true, density: "comfortable" })
            .mockRejectedValueOnce(new Error("Reload failed"));
        function TestReloader() {
            const { reload } = usePreferences();
            return <button data-testid="reload" onClick={() => reload()}>Reload</button>;
        }
        render(
            <PreferencesProvider>
                <TestReloader />
                <TestConsumer />
            </PreferencesProvider>
        );
        await act(async () => { });
        screen.getByTestId("reload").click();
        await act(async () => { });
        // Should keep previous prefs
        expect(screen.getByTestId("prefs")).toHaveTextContent("it-dark");
    });

    it("applies preferences to DOM on mount", async () => {
        render(
            <PreferencesProvider>
                <TestConsumer />
            </PreferencesProvider>
        );
        await act(async () => { });
        expect(document.documentElement.classList.contains("dark")).toBe(true);
        expect(document.documentElement.dataset.density).toBe("comfortable");
    });
});