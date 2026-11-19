import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import StartupPage from "../page";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush, replace: mockPush }),
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
    // 24/10: hasStoredSession() chiama isTauri() — il mock deve esportarlo.
    isTauri: () => false,
}));

const mockRefreshSession = vi.fn();
vi.mock("../../../shared/auth", () => ({
    useAuth: () => ({ refreshSession: mockRefreshSession }),
}));

// Mock stateless di default: ultimo sync mai avvenuto → isSyncing=false e
// lastSyncResult=null (lo step sync resta pending finché non viene risolto
// o saltato). Per il caso "sessione autenticata" triggerInitialSync simula il
// completamento del sync settando lastSyncResult (→ step sync done).
let mockLastSyncResult: { uploaded: number; downloaded: number; skipped: number; skippedExisting: number; skippedLocked: number; errors: string[] } | null = null;
let mockIsSyncing = false;
vi.mock("../../../hooks/CloudSyncContext", () => ({
    useCloudSyncContext: () => ({
        triggerInitialSync: vi.fn(async () => {
            // Autenticato: il sync "completa" subito (nessun file da sync → done).
            mockIsSyncing = true;
            mockIsSyncing = false;
            mockLastSyncResult = { uploaded: 0, downloaded: 0, skipped: 0, skippedExisting: 0, skippedLocked: 0, errors: [] };
        }),
        isSyncing: mockIsSyncing,
        lastSyncResult: mockLastSyncResult,
        status: {},
        syncEnabled: false,
        excludedIds: [],
        toggleExclude: vi.fn(),
        pendingCloudDeletions: [],
        resolveCloudDeletion: vi.fn(),
    }),
}));

describe("StartupPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        localStorage.clear();
        mockRefreshSession.mockResolvedValue(null);
        mockLastSyncResult = null;
        mockIsSyncing = false;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("renders startup page with all steps", () => {
        render(<StartupPage />);
        expect(screen.getByText("Avvio applicazione")).toBeInTheDocument();
        expect(screen.getByText("Avvio backend...")).toBeInTheDocument();
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

    it("redirects straight to /app when a session is restored, skipping login/wizard", async () => {
        // Regression: the first restore attempt fires the instant the app
        // boots and can lose the race against the sidecar starting up,
        // landing on /login before a later, unrelated retry redirects to
        // /app — a visible flash/delay. The startup screen must retry once
        // the backend is confirmed healthy and go straight to /app.
        mockRefreshSession.mockResolvedValue({ id: "u1", email: "a@b.com" });
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

        expect(mockRefreshSession).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/app");
        expect(mockPush).not.toHaveBeenCalledWith("/login");

        globalThis.fetch = origFetch;
    });
});
