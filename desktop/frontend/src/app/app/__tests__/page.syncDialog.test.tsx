import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React from "react";
import EditorPage from "../page";

// #932: EditorPage renderizza ChatAssistant, che usa useRouter da
// next/navigation — senza il mock la render esplode con
// "invariant expected app router to be mounted".
vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

// ─── Mocks ────────────────────────────────────────────────────────

const mockListPdfs = vi.fn();
const mockDownloadPdf = vi.fn();
const mockUploadPdf = vi.fn();
const mockImportFile = vi.fn();
const mockDeletePdf = vi.fn();
const mockUpdateMetadata = vi.fn();
const mockRefreshCsrf = vi.fn();
const mockTauriInvoke = vi.fn();

const mockUser: any = { id: "u1", email: "test@test.com", full_name: "Test User", license_tier: "pro" };
const mockPrefs: any = { language: "it", default_zoom: 100, default_save_folder: "" };
const mockSyncStatus: Record<string, string> = {};
const mockIsTauri = false;

// Issue-1072: isSyncing/lastSyncResult sono mutabili per simulare la
// transizione true→false che apre il dialog "Sync completato"
// (vedi l'useEffect in page.tsx che osserva questa transizione).
let mockIsSyncing = false;
let mockLastSyncResult: any = null;

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}));

vi.mock("../../../shared/auth", () => ({
    useAuth: () => ({ user: mockUser }),
}));

vi.mock("../../../shared/tauri", () => ({
    isTauri: () => mockIsTauri,
    getApiBaseUrl: () => "http://127.0.0.1:7723",
    tauriInvoke: (...args: any[]) => mockTauriInvoke(...args),
}));

const mockOnDragDropEvent = vi.fn();
vi.mock("@tauri-apps/api/webview", () => ({
    getCurrentWebview: () => ({
        onDragDropEvent: (...args: any[]) => mockOnDragDropEvent(...args),
    }),
}));

vi.mock("../../../lib/preferences", () => ({
    usePreferences: () => ({
        prefs: mockPrefs,
        updatePrefs: vi.fn(),
    }),
}));

vi.mock("../../../hooks/useCloudSync", () => ({
    useCloudSync: () => ({
        status: mockSyncStatus,
    }),
}));

vi.mock("../../../hooks/CloudSyncContext", () => ({
    useCloudSyncContext: () => ({
        triggerInitialSync: vi.fn(),
        status: mockSyncStatus,
        syncEnabled: false,
        excludedIds: [],
        toggleExclude: vi.fn(),
        pendingCloudDeletions: [],
        resolveCloudDeletion: vi.fn(),
        isSyncing: mockIsSyncing,
        lastSyncResult: mockLastSyncResult,
        clearSyncResult: vi.fn(),
    }),
}));

vi.mock("../../../shared/api", () => ({
    api: {
        listPdfs: (...args: any[]) => mockListPdfs(...args),
        downloadPdf: (...args: any[]) => mockDownloadPdf(...args),
        uploadPdf: (...args: any[]) => mockUploadPdf(...args),
        importFile: (...args: any[]) => mockImportFile(...args),
        deletePdf: (...args: any[]) => mockDeletePdf(...args),
        updateMetadata: (...args: any[]) => mockUpdateMetadata(...args),
        refreshCsrf: (...args: any[]) => mockRefreshCsrf(...args),
    },
}));

vi.mock("../../../components/PdfViewer", () => ({
    default: () => <div data-testid="pdf-viewer">PDF Viewer</div>,
}));

describe("EditorPage — sync complete dialog (issue-1072)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockListPdfs.mockResolvedValue({ items: [], total: 0 });
        mockIsSyncing = false;
        mockLastSyncResult = null;
    });

    it("shows the 'already aligned' message instead of bare zero counters when nothing changed", () => {
        mockLastSyncResult = { uploaded: 0, downloaded: 0, skipped: 0, skippedExisting: 0, skippedLocked: 0, errors: [] };
        const { rerender } = render(<EditorPage />);
        // Simulate the isSyncing true→false transition that opens the dialog.
        mockIsSyncing = true;
        act(() => { rerender(<EditorPage />); });
        mockIsSyncing = false;
        act(() => { rerender(<EditorPage />); });

        expect(screen.getByText("syncAllAlignedDesc")).toBeInTheDocument();
        expect(screen.queryByText("syncCompleteDesc")).not.toBeInTheDocument();
    });

    it("shows the normal breakdown when something was actually synced", () => {
        mockLastSyncResult = { uploaded: 2, downloaded: 1, skipped: 0, skippedExisting: 0, skippedLocked: 0, errors: [] };
        const { rerender } = render(<EditorPage />);
        mockIsSyncing = true;
        act(() => { rerender(<EditorPage />); });
        mockIsSyncing = false;
        act(() => { rerender(<EditorPage />); });

        expect(screen.getByText("syncCompleteDesc")).toBeInTheDocument();
        expect(screen.queryByText("syncAllAlignedDesc")).not.toBeInTheDocument();
    });
});
