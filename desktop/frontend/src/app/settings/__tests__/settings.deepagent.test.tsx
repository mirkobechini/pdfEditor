/**
 * Tests for the Deep Agent settings redesign (24/10, issue #1035).
 *
 * Covers:
 *  - key MASCHERATA (api_key_masked) mostrata nella UI, campo di inserimento
 *    che non rivela la chiave;
 *  - blocco principale come unico punto per configurare il provider attivo
 *    (niente bottone "+ Aggiungi provider") + key che finisce in testa alla
 *    lista providers al salvataggio;
 *  - cancellazione esplicita della chiave (api_key: "" nel payload);
 *  - test connessione PER RIGA (POST /mind/test con provider+modello di quella riga).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SettingsPage from "../page";

// ─── Mocks ────────────────────────────────────────────────────────

let mockUser: any = { id: "u1", email: "test@test.com", full_name: "Test User", license_tier: "pro" };
let mockGetMindConfig: any = vi.fn();
let mockUpdateMindConfig: any = vi.fn();
let mockFetch: any = vi.fn();

const TMAP: Record<string, string> = {
    deepAgentTitle: "Deep Agent",
    deepAgentDesc: "desc",
    deepAgentProvider: "Provider",
    deepAgentProviderDesc: "desc",
    deepAgentModel: "Model",
    deepAgentModelDesc: "desc",
    deepAgentRag: "RAG",
    deepAgentRagDesc: "desc",
    deepAgentApiKey: "API key",
    deepAgentApiKeyFor: "{provider} API key",
    deepAgentApiKeySet: "Set",
    deepAgentApiKeyNotSet: "Not set",
    deepAgentKeyCurrent: "Active key: {masked}",
    deepAgentKeyNotNeeded: "Not needed",
    deepAgentKeyReplacePlaceholder: "New key (leave empty to keep current)",
    deepAgentKeyAddPlaceholder: "Enter the API key",
    deepAgentApiKeyPlaceholder: "Leave empty to keep unchanged",
    deepAgentKeyRemove: "Remove key",
    deepAgentKeyRemoveUndo: "Undo",
    deepAgentKeyWillRemove: "Will be removed on save",
    deepAgentRowTest: "Test",
    deepAgentTest: "Test connection",
    deepAgentTesting: "Testing...",
    deepAgentTestOk: "OK",
    deepAgentTestFail: "FAIL",
    deepAgentSave: "Save config",
    deepAgentSaved: "Saved ✓",
    deepAgentProviders: "Providers",
    deepAgentAddProvider: "Add provider",
    deepAgentProvidersDesc: "desc",
    deepAgentNoProviders: "No providers yet",
    deepAgentPrecedenceUp: "Up",
    deepAgentPrecedenceDown: "Down",
    deepAgentRemove: "Remove",
    deepAgentFallback: "Fallback",
    deepAgentFallbackDesc: "desc",
    deepAgentSelectProvider: "Select provider",
    deepAgentModelSelectPlaceholder: "Select a model",
    deepAgentModelNoProvider: "Choose a provider first",
    deepAgentModelEmpty: "No models",
    deepAgentNeedKeyForModels: "Enter key to see models",
    deepAgentEnable: "Enable",
    backToEditor: "← Editor",
};

vi.mock("next-intl", () => ({
    useTranslations: () => (k: string, params?: Record<string, unknown>) => {
        let t = TMAP[k] ?? k;
        if (params) {
            for (const [pk, pv] of Object.entries(params)) {
                t = t.split(`{${pk}}`).join(String(pv));
            }
        }
        return t;
    },
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("../../../shared/auth", () => ({
    useAuth: () => ({ user: mockUser }),
}));

vi.mock("../../../shared/tauri", () => ({
    isTauri: () => false,
    tauriInvoke: vi.fn(),
    getApiBaseUrl: () => "http://backend.test",
    getCloudApiBaseUrl: () => "http://backend.test",
}));

vi.mock("../../../lib/preferences", () => ({
    usePreferences: () => ({
        prefs: { theme: "dark", language: "it", default_zoom: 100, antialiasing: true, density: "comfortable", default_save_folder: "" },
        updatePrefs: vi.fn(),
        reload: vi.fn(),
    }),
}));

vi.mock("../../../hooks/useCloudSync", () => ({
    useCloudSync: () => ({
        syncEnabled: true,
        setSyncEnabled: vi.fn(),
        syncOnStartup: true,
        setSyncOnStartup: vi.fn(),
        isOnline: true,
        isSyncing: false,
        progress: null,
        syncAll: vi.fn(),
        status: {},
        uploadPdf: vi.fn(),
        downloadPdf: vi.fn(),
        lastSyncResult: null,
        clearSyncResult: vi.fn(),
        pendingCloudDeletions: null,
        resolveCloudDeletion: vi.fn(),
    }),
}));

vi.mock("../../../shared/api", () => ({
    api: {
        getMindConfig: (...args: any[]) => mockGetMindConfig(...args),
        updateMindConfig: (...args: any[]) => mockUpdateMindConfig(...args),
    },
}));

// ─── Helpers ──────────────────────────────────────────────────────

function mindConfigOverrides(over: Record<string, unknown>) {
    return {
        provider: "",
        model: "",
        workspace: "workspace",
        rag_enabled: true,
        streaming: true,
        has_api_key: false,
        api_key_masked: "",
        providers: [],
        fallback_enabled: true,
        ...over,
    };
}

function openDeepAgentTab() {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("deepAgent"));
}

function defaultFetchHandler(url: unknown, init?: RequestInit) {
    const u = String(url);
    if (u.includes("/mind/test")) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true, message: "OK from test" }) });
    }
    if (u.includes("/mind/models") || u.includes("/mind/ollama/models")) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ models: [] }) });
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
}

// ─── Tests ────────────────────────────────────────────────────────

describe("SettingsPage Deep Agent redesign", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUser = { id: "u1", email: "test@test.com", full_name: "Test User", license_tier: "pro" };
        mockGetMindConfig = vi.fn().mockResolvedValue(mindConfigOverrides({}));
        mockUpdateMindConfig = vi.fn().mockImplementation((patch: any) => Promise.resolve(mindConfigOverrides(patch)));
        mockFetch = vi.fn();
        vi.stubGlobal("fetch", mockFetch);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("shows the MASKED key in the UI and the input fields do not reveal the key", async () => {
        mockGetMindConfig.mockResolvedValue(mindConfigOverrides({
            provider: "anthropic",
            model: "claude-sonnet-4",
            has_api_key: true,
            api_key_masked: "sk-a…efgh",
            providers: [
                { provider: "anthropic", model: "claude-sonnet-4", enabled: true, has_api_key: true, api_key_masked: "sk-a…efgh" },
                { provider: "openai", model: "gpt-4o", enabled: true, has_api_key: true, api_key_masked: "sk-b…wxyz" },
            ],
        }));
        openDeepAgentTab();

        // Blocco principale: forma mascherata della key attiva, mai il valore intero
        expect(await screen.findByText("Active key: sk-a…efgh")).toBeInTheDocument();

        // Il campo di inserimento (sostituzione) è vuoto e tipo password: non rivela nulla
        const replaceInputs = screen.getAllByPlaceholderText("New key (leave empty to keep current)") as HTMLInputElement[];
        const replaceInput = replaceInputs[0]; // blocco principale (primo in ordine DOM)
        expect(replaceInput.type).toBe("password");
        expect(replaceInput.value).toBe("");

        // Riga della lista: forma mascherata della key del provider
        expect(screen.getByText("sk-a…efgh")).toBeInTheDocument();
        expect(screen.getByText("sk-b…wxyz")).toBeInTheDocument();

        // I campi di inserimento per riga non rivelano la chiave
        const rowInputs = screen.getAllByPlaceholderText("New key (leave empty to keep current)") as HTMLInputElement[];
        rowInputs.forEach((inp) => {
            expect(inp.type).toBe("password");
            expect(inp.value).toBe("");
        });
    });

    it("main block is the single point to configure the active provider (no \"+ Add provider\" button)", async () => {
        mockFetch.mockImplementation(defaultFetchHandler);
        openDeepAgentTab();

        // Il bottone "+ Aggiungi provider" NON deve esistere più (redesign 24/10)
        expect(screen.queryByText("Add provider")).toBeNull();

        // Seleziona il provider attivo nel blocco principale
        const providerSelect = screen.getAllByRole("combobox")[0];
        fireEvent.change(providerSelect, { target: { value: "anthropic" } });

        // Digita la key
        fireEvent.change(screen.getByPlaceholderText("Leave empty to keep unchanged"), { target: { value: "sk-test-123" } });

        // Salva
        fireEvent.click(screen.getByText("Save config"));

        await waitFor(() => {
            expect(mockUpdateMindConfig).toHaveBeenCalled();
        });
        const patch = mockUpdateMindConfig.mock.calls[0][0];
        expect(patch.provider).toBe("anthropic");
        expect(patch.api_key).toBe("sk-test-123");
        // Il provider attivo finisce IN TESTA alla lista providers con la sua key
        expect(patch.providers[0]).toEqual({ provider: "anthropic", model: "", enabled: true, api_key: "sk-test-123" });
    });

    it("explicit 'Remove key' sends api_key: \"\" for the active provider (deletion)", async () => {
        mockFetch.mockImplementation(defaultFetchHandler);
        mockGetMindConfig.mockResolvedValue(mindConfigOverrides({
            provider: "openai",
            has_api_key: true,
            api_key_masked: "sk-a…efgh",
            providers: [
                { provider: "openai", model: "gpt-4o", enabled: true, has_api_key: true, api_key_masked: "sk-a…efgh" },
            ],
        }));
        openDeepAgentTab();

        expect(await screen.findByText("Active key: sk-a…efgh")).toBeInTheDocument();

        // Clicca "Rimuovi chiave" nel blocco principale (primo in ordine DOM;
        // anche la riga in lista ha il suo bottone con lo stesso testo)
        const removeButtons = screen.getAllByText("🗑 Remove key");
        fireEvent.click(removeButtons[0]);
        expect(screen.getByText("Will be removed on save")).toBeInTheDocument();

        fireEvent.click(screen.getByText("Save config"));
        await waitFor(() => {
            expect(mockUpdateMindConfig).toHaveBeenCalled();
        });
        const patch = mockUpdateMindConfig.mock.calls[0][0];
        // La cancellazione esplicita manda api_key: "" (mai la chiave intera)
        expect(patch.api_key).toBe("");
        expect(patch.providers[0].api_key).toBe("");
    });

    it("row-level 'Test' calls POST /mind/test with THAT row's provider and model, with per-row feedback", async () => {
        mockFetch.mockImplementation(defaultFetchHandler);
        mockGetMindConfig.mockResolvedValue(mindConfigOverrides({
            provider: "openai",
            has_api_key: true,
            api_key_masked: "sk-a…efgh",
            providers: [
                { provider: "openai", model: "gpt-4o", enabled: true, has_api_key: true, api_key_masked: "sk-a…efgh" },
                { provider: "anthropic", model: "claude-sonnet-4", enabled: true, has_api_key: true, api_key_masked: "sk-b…wxyz" },
            ],
        }));
        openDeepAgentTab();

        // Ogni riga ha il suo bottone Test (2 righe → 2 bottoni "Test")
        const testButtons = await screen.findAllByText("Test");
        expect(testButtons.length).toBe(2);

        // Test sulla PRIMA riga (openai / gpt-4o)
        fireEvent.click(testButtons[0]);

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                "http://backend.test/mind/test",
                expect.objectContaining({ method: "POST" }),
            );
        });
        const testCall = mockFetch.mock.calls.find((c: any[]) => String(c[0]).includes("/mind/test"));
        const body = JSON.parse(testCall[1].body);
        expect(body.provider).toBe("openai");
        expect(body.model).toBe("gpt-4o");

        // Feedback per riga (ok con messaggio)
        expect(await screen.findByText("✓ OK from test")).toBeInTheDocument();
    });
});
