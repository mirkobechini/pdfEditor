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

    it("advanced tab shows workplace folder", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Avanzate"));
        expect(screen.getByText("Cartella di lavoro")).toBeInTheDocument();
        expect(screen.getByText("Non impostata")).toBeInTheDocument();
    });
    it("advanced tab shows system log button", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Avanzate"));
        expect(screen.getByText("Log di sistema")).toBeInTheDocument();
    });
    it("advanced tab shows clear cache button", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Avanzate"));
        expect(screen.getByText("Svuota cache")).toBeInTheDocument();
    });
    it("about tab shows app name and version", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        expect(screen.getByText("PdfEditor")).toBeInTheDocument();
        expect(screen.getByText(/pro License/)).toBeInTheDocument();
    });
    it("about tab shows runtime info", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        expect(screen.getByText("PyMuPDF 1.25")).toBeInTheDocument();
        expect(screen.getByText("PowerShell 7")).toBeInTheDocument();
        expect(screen.getByText("FastAPI 0.115")).toBeInTheDocument();
    });
    it("about tab shows license info", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        expect(screen.getByText("MIT")).toBeInTheDocument();
        expect(screen.getByText("Visualizza")).toBeInTheDocument();
    });
    it("about tab shows action buttons", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        expect(screen.getByText("Novità")).toBeInTheDocument();
        expect(screen.getByText("Segnala bug")).toBeInTheDocument();
        expect(screen.getByText("Documentazione")).toBeInTheDocument();
    });
    it("opens bug report modal from about tab", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Segnala bug"));
        expect(screen.getByPlaceholderText("Titolo")).toBeInTheDocument();
    });
    it("bug report modal validates empty fields", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Segnala bug"));
        fireEvent.click(screen.getByText("Invia"));
        expect(screen.getByText("Compila tutti i campi")).toBeInTheDocument();
    });
    it("bug report modal submits successfully", async () => {
        mockCreateBugReport.mockResolvedValue(undefined);
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Segnala bug"));
        fireEvent.change(screen.getByPlaceholderText("Titolo"), { target: { value: "Test bug" } });
        fireEvent.change(screen.getByPlaceholderText("Descrizione"), { target: { value: "Test descrizione" } });
        fireEvent.click(screen.getByText("Invia"));
        await waitFor(() => {
            expect(mockCreateBugReport).toHaveBeenCalledWith("Test bug", "Test descrizione");
        });
        expect(screen.getByText("Grazie!")).toBeInTheDocument();
    });
    it("bug report modal shows error on failure", async () => {
        mockCreateBugReport.mockRejectedValue(new Error("Errore di rete"));
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
    it("opens changelog modal from about tab", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Novità"));
        expect(screen.getByText("Caricamento in corso...")).toBeInTheDocument();
    });
    it("opens documentation modal from about tab", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        const docButtons = screen.getAllByText("Documentazione");
        // Click the one in the about tab (not the sidebar)
        fireEvent.click(docButtons[docButtons.length - 1]);
        expect(screen.getByText("Apri su GitHub")).toBeInTheDocument();
    });
    it("shows Free license for free users", () => {
        mockUser = { ...mockUser, license_tier: "free" };
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        expect(screen.getByText(/free License/)).toBeInTheDocument();
    });
    it("bug report modal shows success message after submit", async () => {
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
        expect(screen.getByText("Chiudi")).toBeInTheDocument();
    });
    it("bug report modal closes after success", async () => {
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
    it("documentation modal opens and closes", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        const docButtons = screen.getAllByText("Documentazione");
        fireEvent.click(docButtons[docButtons.length - 1]);
        expect(screen.getByText("Apri su GitHub")).toBeInTheDocument();
        fireEvent.click(screen.getByText("Chiudi"));
        expect(screen.queryByText("Apri su GitHub")).not.toBeInTheDocument();
    });
    it("bug report modal closes via X button", async () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Segnala bug"));
        const closeBtns = screen.getAllByRole("button").filter(b => b.querySelector("svg"));
        if (closeBtns.length > 0) fireEvent.click(closeBtns[0]);
        expect(screen.queryByPlaceholderText("Titolo")).not.toBeInTheDocument();
    });
    it("bug report modal cancels via Annulla button", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Segnala bug"));
        fireEvent.click(screen.getByText("Annulla"));
        expect(screen.queryByPlaceholderText("Titolo")).not.toBeInTheDocument();
    });
    it("bug report shows sending state", async () => {
        mockCreateBugReport.mockImplementation(() => new Promise((r) => setTimeout(r, 1000)));
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Segnala bug"));
        fireEvent.change(screen.getByPlaceholderText("Titolo"), { target: { value: "Test" } });
        fireEvent.change(screen.getByPlaceholderText("Descrizione"), { target: { value: "Test" } });
        fireEvent.click(screen.getByText("Invia"));
        expect(screen.getByText("Invio...")).toBeInTheDocument();
    });
    it("bug report shows error on non-Error rejection", async () => {
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
    it("changelog modal shows loading state", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Novità"));
        expect(screen.getByText("Caricamento in corso...")).toBeInTheDocument();
    });
    it("changelog modal closes via X button", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Novità"));
        const closeBtns = screen.getAllByRole("button").filter(b => b.querySelector("svg"));
        if (closeBtns.length > 0) fireEvent.click(closeBtns[0]);
        expect(screen.queryByText("Caricamento in corso...")).not.toBeInTheDocument();
    });
    it("changelog modal closes via Chiudi button", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Novità"));
        const chiudiBtns = screen.getAllByText("Chiudi");
        if (chiudiBtns.length > 0) fireEvent.click(chiudiBtns[chiudiBtns.length - 1]);
        expect(screen.queryByText("Caricamento in corso...")).not.toBeInTheDocument();
    });
    it("documentation modal closes via X button", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        const docButtons = screen.getAllByText("Documentazione");
        fireEvent.click(docButtons[docButtons.length - 1]);
        const closeBtns = screen.getAllByRole("button").filter(b => b.querySelector("svg"));
        if (closeBtns.length > 0) fireEvent.click(closeBtns[0]);
        expect(screen.queryByText("Apri su GitHub")).not.toBeInTheDocument();
    });
    it("opens changelog and shows entries", async () => {
        const origFetch = globalThis.fetch;
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                desktop: [{ version: "v1.0.0", date: "2025-01-01", changes: ["Fix bug"] }],
            }),
        });
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Novità"));
        await waitFor(() => {
            expect(screen.getByText("v1.0.0")).toBeInTheDocument();
            expect(screen.getByText("Fix bug")).toBeInTheDocument();
        });
        globalThis.fetch = origFetch;
    });
    it("opens changelog and shows empty state on fetch failure", async () => {
        const origFetch = globalThis.fetch;
        globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Novità"));
        await waitFor(() => {
            expect(screen.getByText("Changelog non disponibile.")).toBeInTheDocument();
        });
        globalThis.fetch = origFetch;
    });
    it("changes language via select", () => {
        render(<SettingsPage />);
        const select = screen.getByRole("combobox");
        fireEvent.change(select, { target: { value: "en" } });
        expect(mockUpdatePrefs).toHaveBeenCalledWith({ language: "en" });
        expect(mockSetLocale).toHaveBeenCalledWith("en");
    });
    it("editor tab shows default zoom setting", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Editor"));
        expect(screen.getByText("Zoom predefinito")).toBeInTheDocument();
    });
});
