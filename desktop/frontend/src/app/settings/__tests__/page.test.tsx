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
    isTauri: () => false,
    tauriInvoke: vi.fn(),
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
});
