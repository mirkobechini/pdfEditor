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
    it("advanced tab picks workplace folder via Tauri", async () => {
        mockIsTauri = true;
        mockTauriInvoke.mockResolvedValue("/picked/folder");
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Avanzate"));
        fireEvent.click(screen.getByText("Scegli"));
        await waitFor(() => {
            expect(mockTauriInvoke).toHaveBeenCalledWith("dialog_open_folder", expect.objectContaining({
                defaultPath: undefined,
            }));
        });
        expect(mockUpdatePrefs).toHaveBeenCalledWith({ default_save_folder: "/picked/folder" });
    });
    it("advanced tab workplace folder picker cancelled", async () => {
        mockIsTauri = true;
        mockTauriInvoke.mockResolvedValue(null);
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Avanzate"));
        fireEvent.click(screen.getByText("Scegli"));
        await new Promise((r) => setTimeout(r, 100));
        expect(mockUpdatePrefs).not.toHaveBeenCalled();
    });
    it("advanced tab workplace folder picker error", async () => {
        mockIsTauri = true;
        mockTauriInvoke.mockRejectedValue(new Error("Tauri error"));
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { });
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Avanzate"));
        fireEvent.click(screen.getByText("Scegli"));
        await new Promise((r) => setTimeout(r, 100));
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
    it("advanced tab workplace folder not available in web mode", async () => {
        mockIsTauri = false;
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Avanzate"));
        fireEvent.click(screen.getByText("Scegli"));
        await new Promise((r) => setTimeout(r, 100));
        expect(mockTauriInvoke).not.toHaveBeenCalled();
    });
    it("advanced tab shows change button when folder set", () => {
        mockPrefs = { ...mockPrefs, default_save_folder: "/existing/folder" };
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Avanzate"));
        expect(screen.getByText("Cambia")).toBeInTheDocument();
    });
    it("advanced tab clear cache with confirm", () => {
        const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
        const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => { });
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Avanzate"));
        fireEvent.click(screen.getByText("Elimina"));
        expect(confirmSpy).toHaveBeenCalled();
        expect(alertSpy).toHaveBeenCalled();
        confirmSpy.mockRestore();
        alertSpy.mockRestore();
    });
    it("advanced tab clear cache without confirm", () => {
        const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
        const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => { });
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Avanzate"));
        fireEvent.click(screen.getByText("Elimina"));
        expect(confirmSpy).toHaveBeenCalled();
        expect(alertSpy).not.toHaveBeenCalled();
        confirmSpy.mockRestore();
        alertSpy.mockRestore();
    });
    it("advanced tab system log alert", () => {
        const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => { });
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Avanzate"));
        fireEvent.click(screen.getByText("Apri"));
        expect(alertSpy).toHaveBeenCalled();
        alertSpy.mockRestore();
    });
    it("about tab opens third-party licenses via Tauri", () => {
        mockIsTauri = true;
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Visualizza"));
        expect(mockTauriInvoke).toHaveBeenCalledWith("plugin:opener|open_url", expect.objectContaining({
            url: "https://github.com/mirkobechini/pdfEditor/blob/main/desktop/src-tauri/licenses.json",
        }));
    });
    it("about tab opens third-party licenses via window.open in web", () => {
        mockIsTauri = false;
        const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Visualizza"));
        expect(windowOpenSpy).toHaveBeenCalledWith(
            "https://github.com/mirkobechini/pdfEditor/blob/main/desktop/src-tauri/licenses.json",
            "_blank"
        );
        windowOpenSpy.mockRestore();
    });
});
