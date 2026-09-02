import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import StartupPage from "../page";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush }),
}));

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => {
        const map: Record<string, string> = {
            startingBackend: "Avvio backend...",
            connectingDb: "Connessione database...",
            verifyingApi: "Verifica API...",
            startingApp: "Avvio applicazione",
            timeoutError: "Timeout backend",
            fatalError: "Errore fatale",
            retry: "Riprova",
            ready: "Pronto!",
            version: "v1.0.0",
            license: "MIT",
        };
        return map[key] || key;
    },
}));

vi.mock("../../../shared/tauri", () => ({
    getApiBaseUrl: () => "http://127.0.0.1:7723",
}));

describe("StartupPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        localStorage.clear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("renders startup page with all steps", () => {
        render(<StartupPage />);
        expect(screen.getByText("Avvio applicazione")).toBeInTheDocument();
        expect(screen.getByText("Avvio backend...")).toBeInTheDocument();
        expect(screen.getByText("Connessione database...")).toBeInTheDocument();
        expect(screen.getByText("Verifica API...")).toBeInTheDocument();
    });

    it("shows backend step as running initially", () => {
        render(<StartupPage />);
        const spinner = document.querySelector(".animate-spin");
        expect(spinner).toBeInTheDocument();
    });

    it("shows version and license", () => {
        render(<StartupPage />);
        expect(screen.getByText(/v1\.0\.0/)).toBeInTheDocument();
        expect(screen.getByText(/MIT/)).toBeInTheDocument();
    });

    it("marks backend as done on successful health check", async () => {
        const origFetch = globalThis.fetch;
        globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });

        render(<StartupPage />);

        await act(async () => {
            vi.advanceTimersByTime(1000);
        });

        const doneIcons = screen.getAllByText("✓");
        expect(doneIcons.length).toBeGreaterThanOrEqual(1);

        globalThis.fetch = origFetch;
    });

    it("shows fatal error after all retries fail", async () => {
        const origFetch = globalThis.fetch;
        globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

        render(<StartupPage />);

        for (let i = 0; i < 65; i++) {
            await act(async () => {
                vi.advanceTimersByTime(1000);
            });
        }

        expect(screen.getByText("Errore fatale")).toBeInTheDocument();
        expect(screen.getByText("Riprova")).toBeInTheDocument();

        globalThis.fetch = origFetch;
    });

    it("retries after fatal error", async () => {
        const origFetch = globalThis.fetch;
        globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

        render(<StartupPage />);

        for (let i = 0; i < 65; i++) {
            await act(async () => {
                vi.advanceTimersByTime(1000);
            });
        }

        expect(screen.getByText("Errore fatale")).toBeInTheDocument();

        globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
        fireEvent.click(screen.getByText("Riprova"));

        // After retry, error should be gone and backend check restarts
        expect(screen.queryByText("Errore fatale")).not.toBeInTheDocument();

        globalThis.fetch = origFetch;
    });

    it("shows ready message when all done", async () => {
        const origFetch = globalThis.fetch;
        globalThis.fetch = vi.fn()
            .mockResolvedValueOnce({ ok: true })
            .mockResolvedValueOnce({ ok: true });

        render(<StartupPage />);

        // Advance through health check (1s), DB delay (400ms), API check (500ms), redirect (1200ms)
        for (let i = 0; i < 5; i++) {
            await act(async () => {
                vi.advanceTimersByTime(1000);
            });
        }

        expect(screen.getByText("Pronto!")).toBeInTheDocument();

        globalThis.fetch = origFetch;
    });

    it("redirects to wizard on first launch", async () => {
        const origFetch = globalThis.fetch;
        globalThis.fetch = vi.fn()
            .mockResolvedValueOnce({ ok: true })
            .mockResolvedValueOnce({ ok: true });

        render(<StartupPage />);

        for (let i = 0; i < 5; i++) {
            await act(async () => {
                vi.advanceTimersByTime(1000);
            });
        }

        expect(mockPush).toHaveBeenCalledWith("/wizard");

        globalThis.fetch = origFetch;
    });

    it("redirects to login after wizard completed", async () => {
        localStorage.setItem("pdfeditor_wizard_done", "true");
        const origFetch = globalThis.fetch;
        globalThis.fetch = vi.fn()
            .mockResolvedValueOnce({ ok: true })
            .mockResolvedValueOnce({ ok: true });

        render(<StartupPage />);

        for (let i = 0; i < 5; i++) {
            await act(async () => {
                vi.advanceTimersByTime(1000);
            });
        }

        expect(mockPush).toHaveBeenCalledWith("/login");

        globalThis.fetch = origFetch;
    });
});
