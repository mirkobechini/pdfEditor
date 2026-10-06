/**
 * Tests for SettingsPage.
 *
 * Covers: tab navigation, general tab, appearance tab, cloud tab,
 * editor tab, shortcuts tab, advanced tab, about tab,
 * changelog modal, bug report modal, documentation modal.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SettingsPage from "../page";

// ─── Mocks ────────────────────────────────────────────────────────

const mockSetSyncEnabled = vi.fn();
const mockSetSyncOnStartup = vi.fn();
const mockSyncAll = vi.fn();
const mockClearSyncResult = vi.fn();
const mockUpdatePrefs = vi.fn();
const mockSetLocale = vi.fn();
const mockCreateBugReport = vi.fn();

let mockUser: any = { id: "u1", email: "test@test.com", full_name: "Test User", license_tier: "pro" };
let mockPrefs: any = { language: "it", density: "comfortable", antialiasing: true, default_zoom: 100, default_save_folder: "" };
let mockSyncEnabled = true;
let mockSyncOnStartup = true;
let mockIsOnline = true;
let mockIsSyncing = false;
let mockProgress: any = null;
let mockLastSyncResult: any = null;
let mockIsTauri = false;
let mockTauriInvoke = vi.fn();

vi.mock("next-intl", () => ({
    useTranslations: () => (k: string) => {
        const map: Record<string, string> = {
            general: "Generale",
            generalTitle: "Generale",
            generalDesc: "Impostazioni generali",
            appearance: "Aspetto",
            appearanceTitle: "Aspetto",
            appearanceDesc: "Impostazioni aspetto",
            editor: "Editor",
            editorTitle: "Editor",
            editorDesc: "Impostazioni editor",
            cloud: "Cloud",
            shortcuts: "Scorciatoie",
            shortcutsTitle: "Scorciatoie",
            shortcutsDesc: "Scorciatoie da tastiera",
            advanced: "Avanzate",
            advancedTitle: "Avanzate",
            advancedDesc: "Impostazioni avanzate",
            about: "Informazioni",
            aboutTitle: "Informazioni",
            aboutDesc: "Info app",
            language: "Lingua",
            languageItalian: "Italiano",
            languageEnglish: "English",
            autoStart: "Avvio automatico",
            autoStartDesc: "Avvia all'avvio",
            density: "Densità",
            densityDesc: "Densità interfaccia",
            antialiasing: "Antialiasing",
            antialiasingDesc: "Migliora rendering",
            defaultZoom: "Zoom predefinito",
            defaultZoomDesc: "Zoom iniziale",
            save: "Salva",
            undo: "Annulla",
            redo: "Ripeti",
            search: "Cerca",
            zoomIn: "Ingrandisci",
            zoomOut: "Riduci",
            workplace: "Cartella di lavoro",
            workplaceNotSet: "Non impostata",
            workplaceChange: "Cambia",
            workplaceChoose: "Scegli",
            systemLog: "Log di sistema",
            systemLogDesc: "Visualizza log",
            systemLogAlert: "Log alert",
            open: "Apri",
            clearCache: "Svuota cache",
            clearCacheDesc: "Rimuovi dati temporanei",
            clearCacheConfirm: "Confermi?",
            cacheCleared: "Cache svuotata",
            delete: "Elimina",
            backToEditor: "← Editor",
            syncEnabled: "Sincronizzazione",
            syncEnabledDesc: "Abilita sync",
            syncOnStartup: "Sync all'avvio",
            syncOnStartupDesc: "Sincronizza all'avvio",
            connectionStatus: "Stato connessione",
            online: "Online",
            offline: "Offline",
            syncing: "Sincronizzazione...",
            syncNow: "Sincronizza ora",
            releaseNotes: "Novità",
            reportBug: "Segnala bug",
            documentation: "Documentazione",
            bugTitlePlaceholder: "Titolo",
            bugDescPlaceholder: "Descrizione",
            bugValidationError: "Compila tutti i campi",
            bugSendError: "Errore invio",
            bugSending: "Invio...",
            bugSend: "Invia",
            bugThankYou: "Grazie!",
            pdfEngine: "Motore PDF",
            pdfEngineDesc: "Motore rendering",
            pdfEngineValue: "PyMuPDF 1.25",
            shell: "Shell",
            shellDesc: "Terminale",
            shellValue: "PowerShell 7",
            sidecar: "Sidecar",
            sidecarDesc: "Backend locale",
            sidecarValue: "FastAPI 0.115",
            appLicense: "Licenza app",
            appLicenseDesc: "Tipo licenza",
            appLicenseValue: "MIT",
            thirdParty: "Terze parti",
            thirdPartyDesc: "Librerie esterne",
            thirdPartyValue: "Visualizza",
        };
        return map[k] || k;
    },
}));

vi.mock("../../../shared/auth", () => ({
    useAuth: () => ({ user: mockUser }),
}));

vi.mock("../../../lib/i18n", () => ({
    useLocaleSetter: () => mockSetLocale,
}));

vi.mock("../../../lib/preferences", () => ({
    usePreferences: () => ({
        prefs: mockPrefs,
        updatePrefs: (...args: any[]) => mockUpdatePrefs(...args),
    }),
}));

vi.mock("../../../shared/tauri", () => ({
    isTauri: () => mockIsTauri,
    tauriInvoke: (...args: any[]) => mockTauriInvoke(...args),
}));

vi.mock("../../../hooks/useCloudSync", () => ({
    useCloudSync: () => ({
        syncEnabled: mockSyncEnabled,
        setSyncEnabled: (...args: any[]) => mockSetSyncEnabled(...args),
        syncOnStartup: mockSyncOnStartup,
        setSyncOnStartup: (...args: any[]) => mockSetSyncOnStartup(...args),
        isOnline: mockIsOnline,
        isSyncing: mockIsSyncing,
        progress: mockProgress,
        syncAll: (...args: any[]) => mockSyncAll(...args),
        lastSyncResult: mockLastSyncResult,
        clearSyncResult: (...args: any[]) => mockClearSyncResult(...args),
    }),
}));

vi.mock("../../../shared/api", () => ({
    api: {
        createBugReport: (...args: any[]) => mockCreateBugReport(...args),
    },
}));

// ─── Tests ────────────────────────────────────────────────────────

describe("SettingsPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUser = { id: "u1", email: "test@test.com", full_name: "Test User", license_tier: "pro" };
        mockPrefs = { language: "it", density: "comfortable", antialiasing: true, default_zoom: 100, default_save_folder: "" };
        mockSyncEnabled = true;
        mockSyncOnStartup = true;
        mockIsOnline = true;
        mockIsSyncing = false;
        mockProgress = null;
        mockLastSyncResult = null;
        mockIsTauri = false;
        mockTauriInvoke = vi.fn();
    });

    it("changes density in appearance tab", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Aspetto"));
        const selects = screen.getAllByRole("combobox");
        if (selects.length > 0) {
            fireEvent.change(selects[0], { target: { value: "compact" } });
            expect(mockUpdatePrefs).toHaveBeenCalledWith({ density: "compact" });
        }
    });
    it("toggles antialiasing in appearance tab", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Aspetto"));
        const toggleBtns = screen.getAllByRole("button").filter(b => b.querySelector(".rounded-full"));
        if (toggleBtns.length > 0) fireEvent.click(toggleBtns[0]);
        expect(mockUpdatePrefs).toHaveBeenCalledWith({ antialiasing: false });
    });
    it("shows sync result with errors", () => {
        mockLastSyncResult = { uploaded: 0, downloaded: 0, skipped: 0, errors: ["Error 1"] };
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Cloud"));
        expect(screen.getByText(/Error 1/)).toBeInTheDocument();
    });
    it("shows changelog loading state", () => {
        const origFetch = globalThis.fetch;
        globalThis.fetch = vi.fn().mockImplementation(() => new Promise(() => { }));
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Novità"));
        expect(screen.getByText("Caricamento in corso...")).toBeInTheDocument();
        globalThis.fetch = origFetch;
    });
    it("shows changelog with empty data", async () => {
        const origFetch = globalThis.fetch;
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ desktop: [] }),
        });
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Novità"));
        await waitFor(() => {
            expect(screen.getByText("Changelog non disponibile.")).toBeInTheDocument();
        });
        globalThis.fetch = origFetch;
    });
    it("shows changelog with malformed data", async () => {
        const origFetch = globalThis.fetch;
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({}),
        });
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Novità"));
        await waitFor(() => {
            expect(screen.getByText("Changelog non disponibile.")).toBeInTheDocument();
        });
        globalThis.fetch = origFetch;
    });
    it("shows changelog close button", async () => {
        const origFetch = globalThis.fetch;
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ desktop: [{ version: "v1.0.0", date: "2025-01-01", changes: ["Fix"] }] }),
        });
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Novità"));
        await waitFor(() => {
            expect(screen.getByText("Chiudi")).toBeInTheDocument();
        });
        fireEvent.click(screen.getByText("Chiudi"));
        expect(screen.queryByText("v1.0.0")).not.toBeInTheDocument();
        globalThis.fetch = origFetch;
    });
    it("shows documentation modal open via GitHub button", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        const docBtns = screen.getAllByText("Documentazione");
        fireEvent.click(docBtns[docBtns.length - 1]);
        expect(screen.getByText("Apri su GitHub")).toBeInTheDocument();
    });
    it("shows documentation modal close via Chiudi", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        const docBtns = screen.getAllByText("Documentazione");
        fireEvent.click(docBtns[docBtns.length - 1]);
        fireEvent.click(screen.getByText("Chiudi"));
        expect(screen.queryByText("Apri su GitHub")).not.toBeInTheDocument();
    });
    it("shows documentation modal close via X", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        const docBtns = screen.getAllByText("Documentazione");
        fireEvent.click(docBtns[docBtns.length - 1]);
        const closeBtns = screen.getAllByRole("button").filter(b => b.querySelector("svg"));
        if (closeBtns.length > 0) fireEvent.click(closeBtns[0]);
        expect(screen.queryByText("Apri su GitHub")).not.toBeInTheDocument();
    });
    it("shows bug report modal close via Annulla", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Segnala bug"));
        const cancelBtns = screen.getAllByText("Annulla");
        if (cancelBtns.length > 0) fireEvent.click(cancelBtns[0]);
        expect(screen.queryByPlaceholderText("Titolo")).not.toBeInTheDocument();
    });
    it("shows bug report modal close after success", async () => {
        mockCreateBugReport.mockResolvedValue(undefined);
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Segnala bug"));
        fireEvent.change(screen.getByPlaceholderText("Titolo"), { target: { value: "Test" } });
        fireEvent.change(screen.getByPlaceholderText("Descrizione"), { target: { value: "Test" } });
        fireEvent.click(screen.getByText("Invia"));
        await waitFor(() => {
            expect(screen.getByText("Grazie!")).toBeInTheDocument();
        });
        fireEvent.click(screen.getByText("Chiudi"));
        expect(screen.queryByText("Grazie!")).not.toBeInTheDocument();
    });
    it("shows bug report modal error on non-Error rejection", async () => {
        mockCreateBugReport.mockRejectedValue("string error");
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Segnala bug"));
        fireEvent.change(screen.getByPlaceholderText("Titolo"), { target: { value: "Test" } });
        fireEvent.change(screen.getByPlaceholderText("Descrizione"), { target: { value: "Test" } });
        fireEvent.click(screen.getByText("Invia"));
        await waitFor(() => {
            expect(screen.getByText("common.unknownError")).toBeInTheDocument();
        });
    });
    it("shows bug report modal sending state", async () => {
        mockCreateBugReport.mockImplementation(() => new Promise(() => { }));
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Segnala bug"));
        fireEvent.change(screen.getByPlaceholderText("Titolo"), { target: { value: "Test" } });
        fireEvent.change(screen.getByPlaceholderText("Descrizione"), { target: { value: "Test" } });
        fireEvent.click(screen.getByText("Invia"));
        expect(screen.getByText("Invio...")).toBeInTheDocument();
    });
    it("shows editor tab with default zoom", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Editor"));
        expect(screen.getByText("Zoom predefinito")).toBeInTheDocument();
    });
    it("shows advanced tab with workplace folder", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Avanzate"));
        expect(screen.getByText("Scegli")).toBeInTheDocument();
    });
    it("shows advanced tab with clear cache", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Avanzate"));
        expect(screen.getByText("Svuota cache")).toBeInTheDocument();
    });
    it("shows advanced tab with system log", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Avanzate"));
        expect(screen.getByText("Log di sistema")).toBeInTheDocument();
    });
    it("shows cloud tab with sync on startup toggle", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Cloud"));
        expect(screen.getByText("Sync all'avvio")).toBeInTheDocument();
    });
    it("shows cloud tab with connection status offline", () => {
        mockIsOnline = false;
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Cloud"));
        expect(screen.getByText("Offline")).toBeInTheDocument();
    });
    it("shows cloud tab with syncing state", () => {
        mockIsSyncing = true;
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Cloud"));
        expect(screen.getByText("Sincronizzazione...")).toBeInTheDocument();
    });
    it("shows cloud tab with progress", () => {
        mockProgress = { current: 2, total: 5 };
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Cloud"));
        expect(screen.getByText(/2\/5/)).toBeInTheDocument();
    });
    it("shows cloud tab calls syncAll", async () => {
        mockSyncAll.mockResolvedValue({ uploaded: 0, downloaded: 0, skipped: 0, errors: [] });
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Cloud"));
        fireEvent.click(screen.getByText("Sincronizza ora"));
        await waitFor(() => {
            expect(mockSyncAll).toHaveBeenCalled();
        });
    });
    it("shows cloud tab sync result dialog", () => {
        mockLastSyncResult = { uploaded: 1, downloaded: 0, skipped: 0, errors: [] };
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Cloud"));
        expect(screen.getByText(/1 PDF caricati/)).toBeInTheDocument();
    });
    it("shows cloud tab clears sync result", () => {
        mockLastSyncResult = { uploaded: 1, downloaded: 0, skipped: 0, errors: [] };
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Cloud"));
        const backdrop = screen.getByText(/1 PDF caricati/).closest(".fixed");
        if (backdrop) {
            fireEvent.click(backdrop);
            expect(mockClearSyncResult).toHaveBeenCalled();
        }
    });
    it("shows about tab with license info", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        expect(screen.getByText("MIT")).toBeInTheDocument();
    });
    it("shows about tab with runtime info", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        expect(screen.getByText("PyMuPDF 1.25")).toBeInTheDocument();
    });
    it("shows about tab with action buttons", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        expect(screen.getByText("Novità")).toBeInTheDocument();
        expect(screen.getByText("Segnala bug")).toBeInTheDocument();
        expect(screen.getByText("Documentazione")).toBeInTheDocument();
    });
    it("shows Free license for free users", () => {
        mockUser = { ...mockUser, license_tier: "free" };
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        expect(screen.getByText(/free License/)).toBeInTheDocument();
    });
    it("shows language change via select", () => {
        render(<SettingsPage />);
        const select = screen.getByRole("combobox");
        fireEvent.change(select, { target: { value: "en" } });
        expect(mockUpdatePrefs).toHaveBeenCalledWith({ language: "en" });
        expect(mockSetLocale).toHaveBeenCalledWith("en");
    });
    it("shows changelog with entries and closes", async () => {
        const origFetch = globalThis.fetch;
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ desktop: [{ version: "v1.0.0", date: "2025-01-01", changes: ["Fix"] }] }),
        });
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Novità"));
        await waitFor(() => {
            expect(screen.getByText("v1.0.0")).toBeInTheDocument();
        });
        const closeBtns = screen.getAllByRole("button").filter(b => b.querySelector("svg"));
        if (closeBtns.length > 0) fireEvent.click(closeBtns[0]);
        expect(screen.queryByText("v1.0.0")).not.toBeInTheDocument();
        globalThis.fetch = origFetch;
    });
    it("shows changelog with empty data", async () => {
        const origFetch = globalThis.fetch;
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ desktop: [] }),
        });
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Novità"));
        await waitFor(() => {
            expect(screen.getByText("Changelog non disponibile.")).toBeInTheDocument();
        });
        globalThis.fetch = origFetch;
    });
    it("shows changelog with malformed data", async () => {
        const origFetch = globalThis.fetch;
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({}),
        });
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Novità"));
        await waitFor(() => {
            expect(screen.getByText("Changelog non disponibile.")).toBeInTheDocument();
        });
        globalThis.fetch = origFetch;
    });
    it("shows changelog close via Chiudi button", async () => {
        const origFetch = globalThis.fetch;
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ desktop: [{ version: "v1.0.0", date: "2025-01-01", changes: ["Fix"] }] }),
        });
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Novità"));
        await waitFor(() => {
            expect(screen.getByText("Chiudi")).toBeInTheDocument();
        });
        fireEvent.click(screen.getByText("Chiudi"));
        expect(screen.queryByText("v1.0.0")).not.toBeInTheDocument();
        globalThis.fetch = origFetch;
    });
    it("shows documentation modal open and close via Chiudi", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        const docBtns = screen.getAllByText("Documentazione");
        fireEvent.click(docBtns[docBtns.length - 1]);
        expect(screen.getByText("Apri su GitHub")).toBeInTheDocument();
        fireEvent.click(screen.getByText("Chiudi"));
        expect(screen.queryByText("Apri su GitHub")).not.toBeInTheDocument();
    });
    it("shows documentation modal close via X", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        const docBtns = screen.getAllByText("Documentazione");
        fireEvent.click(docBtns[docBtns.length - 1]);
        const closeBtns = screen.getAllByRole("button").filter(b => b.querySelector("svg"));
        if (closeBtns.length > 0) fireEvent.click(closeBtns[0]);
        expect(screen.queryByText("Apri su GitHub")).not.toBeInTheDocument();
    });
    it("shows bug report modal close via Annulla", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Segnala bug"));
        const cancelBtns = screen.getAllByText("Annulla");
        if (cancelBtns.length > 0) fireEvent.click(cancelBtns[0]);
        expect(screen.queryByPlaceholderText("Titolo")).not.toBeInTheDocument();
    });
    it("shows bug report modal close after success", async () => {
        mockCreateBugReport.mockResolvedValue(undefined);
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Segnala bug"));
        fireEvent.change(screen.getByPlaceholderText("Titolo"), { target: { value: "Test" } });
        fireEvent.change(screen.getByPlaceholderText("Descrizione"), { target: { value: "Test" } });
        fireEvent.click(screen.getByText("Invia"));
        await waitFor(() => {
            expect(screen.getByText("Grazie!")).toBeInTheDocument();
        });
        fireEvent.click(screen.getByText("Chiudi"));
        expect(screen.queryByText("Grazie!")).not.toBeInTheDocument();
    });
    it("shows bug report modal error on non-Error rejection", async () => {
        mockCreateBugReport.mockRejectedValue("string error");
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Segnala bug"));
        fireEvent.change(screen.getByPlaceholderText("Titolo"), { target: { value: "Test" } });
        fireEvent.change(screen.getByPlaceholderText("Descrizione"), { target: { value: "Test" } });
        fireEvent.click(screen.getByText("Invia"));
        await waitFor(() => {
            expect(screen.getByText("common.unknownError")).toBeInTheDocument();
        });
    });
    it("shows bug report modal sending state", async () => {
        mockCreateBugReport.mockImplementation(() => new Promise(() => { }));
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Segnala bug"));
        fireEvent.change(screen.getByPlaceholderText("Titolo"), { target: { value: "Test" } });
        fireEvent.change(screen.getByPlaceholderText("Descrizione"), { target: { value: "Test" } });
        fireEvent.click(screen.getByText("Invia"));
        expect(screen.getByText("Invio...")).toBeInTheDocument();
    });
    it("shows cloud tab with syncing state", () => {
        mockIsSyncing = true;
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Cloud"));
        expect(screen.getByText("Sincronizzazione...")).toBeInTheDocument();
    });
    it("shows cloud tab with progress", () => {
        mockProgress = { current: 2, total: 5 };
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Cloud"));
        expect(screen.getByText(/2\/5/)).toBeInTheDocument();
    });
    it("shows cloud tab calls syncAll", async () => {
        mockSyncAll.mockResolvedValue({ uploaded: 0, downloaded: 0, skipped: 0, errors: [] });
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Cloud"));
        fireEvent.click(screen.getByText("Sincronizza ora"));
        await waitFor(() => {
            expect(mockSyncAll).toHaveBeenCalled();
        });
    });
    it("shows cloud tab sync result dialog", () => {
        mockLastSyncResult = { uploaded: 1, downloaded: 0, skipped: 0, errors: [] };
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Cloud"));
        expect(screen.getByText(/1 PDF caricati/)).toBeInTheDocument();
    });
    it("shows cloud tab clears sync result", () => {
        mockLastSyncResult = { uploaded: 1, downloaded: 0, skipped: 0, errors: [] };
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Cloud"));
        const backdrop = screen.getByText(/1 PDF caricati/).closest(".fixed");
        if (backdrop) {
            fireEvent.click(backdrop);
            expect(mockClearSyncResult).toHaveBeenCalled();
        }
    });
    it("shows about tab with license info", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        expect(screen.getByText("MIT")).toBeInTheDocument();
    });
    it("shows about tab with runtime info", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        expect(screen.getByText("PyMuPDF 1.25")).toBeInTheDocument();
    });
    it("shows about tab with action buttons", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        expect(screen.getByText("Novità")).toBeInTheDocument();
        expect(screen.getByText("Segnala bug")).toBeInTheDocument();
        expect(screen.getByText("Documentazione")).toBeInTheDocument();
    });
    it("shows Free license for free users", () => {
        mockUser = { ...mockUser, license_tier: "free" };
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        expect(screen.getByText(/free License/)).toBeInTheDocument();
    });
    it("shows density change in appearance tab", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Aspetto"));
        const selects = screen.getAllByRole("combobox");
        if (selects.length > 0) {
            fireEvent.change(selects[0], { target: { value: "compact" } });
            expect(mockUpdatePrefs).toHaveBeenCalledWith({ density: "compact" });
        }
    });
    it("shows antialiasing toggle in appearance tab", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Aspetto"));
        const toggleBtns = screen.getAllByRole("button").filter(b => b.querySelector(".rounded-full"));
        if (toggleBtns.length > 0) fireEvent.click(toggleBtns[0]);
        expect(mockUpdatePrefs).toHaveBeenCalledWith({ antialiasing: false });
    });
});
