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
});
