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

    // ── Rendering ─────────────────────────────────────────────

    it("renders sidebar with all sections", () => {
        render(<SettingsPage />);
        const buttons = screen.getAllByText("Generale");
        expect(buttons.length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("Aspetto")).toBeInTheDocument();
        expect(screen.getByText("Editor")).toBeInTheDocument();
        expect(screen.getByText("Cloud")).toBeInTheDocument();
        expect(screen.getByText("Scorciatoie")).toBeInTheDocument();
        expect(screen.getByText("Avanzate")).toBeInTheDocument();
        expect(screen.getByText("Informazioni")).toBeInTheDocument();
    });

    it("renders back to editor link", () => {
        render(<SettingsPage />);
        expect(screen.getByText("← Editor")).toBeInTheDocument();
    });

    it("shows general tab by default", () => {
        render(<SettingsPage />);
        expect(screen.getByText("Impostazioni generali")).toBeInTheDocument();
    });

    // ── Tab navigation ────────────────────────────────────────

    it("switches to appearance tab", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Aspetto"));
        expect(screen.getByText("Impostazioni aspetto")).toBeInTheDocument();
    });

    it("switches to editor tab", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Editor"));
        expect(screen.getByText("Impostazioni editor")).toBeInTheDocument();
    });

    it("switches to cloud tab", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Cloud"));
        expect(screen.getByText("Sincronizzazione")).toBeInTheDocument();
    });

    it("switches to shortcuts tab", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Scorciatoie"));
        expect(screen.getByText("Ctrl+S")).toBeInTheDocument();
        expect(screen.getByText("Ctrl+Z")).toBeInTheDocument();
        expect(screen.getByText("Ctrl+Shift+Z")).toBeInTheDocument();
        expect(screen.getByText("Ctrl+F")).toBeInTheDocument();
        expect(screen.getByText("Ctrl++")).toBeInTheDocument();
        expect(screen.getByText("Ctrl+-")).toBeInTheDocument();
    });

    it("switches to advanced tab", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Avanzate"));
        expect(screen.getByText("Impostazioni avanzate")).toBeInTheDocument();
    });

    it("switches to about tab", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        expect(screen.getByText("Info app")).toBeInTheDocument();
    });

    // ── General tab ───────────────────────────────────────────

    it("general tab shows language selector", () => {
        render(<SettingsPage />);
        expect(screen.getByText("Lingua")).toBeInTheDocument();
        const italianElements = screen.getAllByText("Italiano");
        expect(italianElements.length).toBeGreaterThanOrEqual(1);
    });

    it("general tab shows auto start", () => {
        render(<SettingsPage />);
        expect(screen.getByText("Avvio automatico")).toBeInTheDocument();
    });

    // ── Appearance tab ────────────────────────────────────────

    it("appearance tab shows density selector", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Aspetto"));
        expect(screen.getByText("Densità")).toBeInTheDocument();
    });

    it("appearance tab shows antialiasing toggle", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Aspetto"));
        expect(screen.getByText("Antialiasing")).toBeInTheDocument();
    });

    // ── Cloud tab ─────────────────────────────────────────────

    it("cloud tab shows sync toggle", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Cloud"));
        expect(screen.getByText("Sincronizzazione")).toBeInTheDocument();
    });

    it("cloud tab shows sync now button", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Cloud"));
        expect(screen.getByText("Sincronizza ora")).toBeInTheDocument();
    });

    it("cloud tab shows connection status", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Cloud"));
        expect(screen.getByText("Online")).toBeInTheDocument();
    });

    it("cloud tab shows offline status", () => {
        mockIsOnline = false;
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Cloud"));
        expect(screen.getByText("Offline")).toBeInTheDocument();
    });

    it("cloud tab shows syncing state", () => {
        mockIsSyncing = true;
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Cloud"));
        expect(screen.getByText("Sincronizzazione...")).toBeInTheDocument();
    });

    it("cloud tab shows progress", () => {
        mockProgress = { current: 2, total: 5 };
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Cloud"));
        expect(screen.getByText(/2\/5/)).toBeInTheDocument();
    });

    it("cloud tab calls syncAll on sync now click", async () => {
        mockSyncAll.mockResolvedValue({ uploaded: 0, downloaded: 0, skipped: 0, errors: [] });
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Cloud"));
        fireEvent.click(screen.getByText("Sincronizza ora"));
        await waitFor(() => {
            expect(mockSyncAll).toHaveBeenCalled();
        });
    });

    it("cloud tab shows sync result dialog", () => {
        mockLastSyncResult = { uploaded: 1, downloaded: 0, skipped: 0, errors: [] };
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Cloud"));
        expect(screen.getByText(/1 PDF caricati/)).toBeInTheDocument();
    });

    it("cloud tab clears sync result on backdrop click", () => {
        mockLastSyncResult = { uploaded: 1, downloaded: 0, skipped: 0, errors: [] };
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Cloud"));
        // Click backdrop
        const backdrop = screen.getByText(/1 PDF caricati/).closest(".fixed");
        if (backdrop) {
            fireEvent.click(backdrop);
            expect(mockClearSyncResult).toHaveBeenCalled();
        }
    });

    // ── Advanced tab ──────────────────────────────────────────

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

    // ── About tab ─────────────────────────────────────────────

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

    // ── Bug report modal ──────────────────────────────────────

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
            expect(mockCreateBugReport).toHaveBeenCalledWith("Test bug", "Test descrizione", "desktop-settings");
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
            expect(screen.getByText("Errore di rete")).toBeInTheDocument();
        });
    });

    // ── Changelog modal ───────────────────────────────────────

    it("opens changelog modal from about tab", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Novità"));
        expect(screen.getByText("Caricamento in corso...")).toBeInTheDocument();
    });

    // ── Documentation modal ───────────────────────────────────

    it("opens documentation modal from about tab", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        const docButtons = screen.getAllByText("Documentazione");
        // Click the one in the about tab (not the sidebar)
        fireEvent.click(docButtons[docButtons.length - 1]);
        expect(screen.getByText("Apri su GitHub")).toBeInTheDocument();
    });

    // ── License tier ──────────────────────────────────────────

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
            expect(screen.getByText("Errore invio")).toBeInTheDocument();
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

    it("advanced tab shows workplace folder choose button", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Avanzate"));
        expect(screen.getByText("Scegli")).toBeInTheDocument();
    });

    it("advanced tab shows clear cache confirm", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Avanzate"));
        const clearBtns = screen.getAllByText("Svuota cache");
        expect(clearBtns.length).toBeGreaterThan(0);
    });

    it("documentation modal closes via X button", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        const docBtns = screen.getAllByText("Documentazione");
        fireEvent.click(docBtns[docBtns.length - 1]);
        expect(screen.getByText("Apri su GitHub")).toBeInTheDocument();
        const closeBtns = screen.getAllByRole("button").filter(b => b.querySelector("svg"));
        if (closeBtns.length > 0) fireEvent.click(closeBtns[0]);
        expect(screen.queryByText("Apri su GitHub")).not.toBeInTheDocument();
    });

    it("documentation modal closes via Chiudi button", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        const docBtns = screen.getAllByText("Documentazione");
        fireEvent.click(docBtns[docBtns.length - 1]);
        expect(screen.getByText("Apri su GitHub")).toBeInTheDocument();
        fireEvent.click(screen.getByText("Chiudi"));
        expect(screen.queryByText("Apri su GitHub")).not.toBeInTheDocument();
    });

    it("bug report modal shows sending state", async () => {
        mockCreateBugReport.mockImplementation(() => new Promise(() => { }));
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Segnala bug"));
        fireEvent.change(screen.getByPlaceholderText("Titolo"), { target: { value: "Test" } });
        fireEvent.change(screen.getByPlaceholderText("Descrizione"), { target: { value: "Test" } });
        fireEvent.click(screen.getByText("Invia"));
        expect(screen.getByText("Invio...")).toBeInTheDocument();
    });

    it("bug report modal shows error on non-Error rejection", async () => {
        mockCreateBugReport.mockRejectedValue("string error");
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Segnala bug"));
        fireEvent.change(screen.getByPlaceholderText("Titolo"), { target: { value: "Test" } });
        fireEvent.change(screen.getByPlaceholderText("Descrizione"), { target: { value: "Test" } });
        fireEvent.click(screen.getByText("Invia"));
        await waitFor(() => {
            expect(screen.getByText("Errore invio")).toBeInTheDocument();
        });
    });

    it("bug report modal closes via Annulla", () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Informazioni"));
        fireEvent.click(screen.getByText("Segnala bug"));
        const cancelBtns = screen.getAllByText("Annulla");
        if (cancelBtns.length > 0) fireEvent.click(cancelBtns[0]);
        expect(screen.queryByPlaceholderText("Titolo")).not.toBeInTheDocument();
    });

    it("changelog modal closes via X button", async () => {
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
            expect(screen.getByText("Errore invio")).toBeInTheDocument();
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
            expect(screen.getByText("Errore invio")).toBeInTheDocument();
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

    // ── Advanced tab actions ────────────────────────────────

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
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
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
        const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
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
        const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
        render(<SettingsPage />);
        fireEvent.click(screen.getByText("Avanzate"));
        fireEvent.click(screen.getByText("Elimina"));
        expect(confirmSpy).toHaveBeenCalled();
        expect(alertSpy).not.toHaveBeenCalled();
        confirmSpy.mockRestore();
        alertSpy.mockRestore();
    });

    it("advanced tab system log alert", () => {
        const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
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
