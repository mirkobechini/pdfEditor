import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import EditorPage from "../page";

// Mock next-intl
vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}));

// Mock api
const mockGetPdf = vi.fn();
const mockDownloadPdf = vi.fn();
const mockUnlockPdf = vi.fn();
const mockUndoPdf = vi.fn();
const mockMergePdfs = vi.fn();
const mockSplitPdf = vi.fn();
const mockReorderPages = vi.fn();
const mockRemovePages = vi.fn();
const mockUpdateMetadata = vi.fn();
const mockDeletePdf = vi.fn();
vi.mock("../../lib/api", () => ({
    api: {
        getPdf: (...args: any[]) => mockGetPdf(...args),
        downloadPdf: (...args: any[]) => mockDownloadPdf(...args),
        unlockPdf: (...args: any[]) => mockUnlockPdf(...args),
        undoPdf: (...args: any[]) => mockUndoPdf(...args),
        mergePdfs: (...args: any[]) => mockMergePdfs(...args),
        splitPdf: (...args: any[]) => mockSplitPdf(...args),
        reorderPages: (...args: any[]) => mockReorderPages(...args),
        removePages: (...args: any[]) => mockRemovePages(...args),
        updateMetadata: (...args: any[]) => mockUpdateMetadata(...args),
        deletePdf: (...args: any[]) => mockDeletePdf(...args),
    },
}));

// Mock auth
const mockUseAuth = vi.fn();
vi.mock("../../lib/auth", () => ({
    useAuth: () => mockUseAuth(),
}));

// Mock child components to expose callbacks via data attributes for testing
vi.mock("../../components/Sidebar", () => ({
    default: ({ onSelect, onUpload, onDeleteClick, selectedId, refreshKey }: any) => (
        <div data-testid="sidebar" data-selected-id={selectedId || ""} data-refresh-key={refreshKey}>
            <button data-testid="sidebar-select" onClick={() => onSelect?.("pdf-1")}>Select PDF</button>
            <button data-testid="sidebar-upload" onClick={() => onUpload?.({ id: "new-pdf", original_filename: "test.pdf", file_size: 100, page_count: 3, is_password_protected: false, created_at: "2026-01-01", updated_at: "2026-01-01" })}>Upload</button>
            <button data-testid="sidebar-delete-click" onClick={() => onDeleteClick?.({ id: "pdf-1", original_filename: "del.pdf", file_size: 100, page_count: 2, created_at: "2026-01-01", updated_at: "2026-01-01" })}>Delete Click</button>
        </div>
    ),
}));

vi.mock("../../components/Toolbar", () => ({
    default: ({ onMerge, onSplit, onReorder, onRemovePages, onReplaceText, onMetadata, onProtect, onUndo, onRedo, canUndo, canRedo, currentPage, totalPages, zoom }: any) => (
        <div data-testid="toolbar" data-can-undo={canUndo} data-can-redo={canRedo}>
            <button data-testid="toolbar-merge" onClick={onMerge}>Merge</button>
            <button data-testid="toolbar-split" onClick={onSplit}>Split</button>
            <button data-testid="toolbar-reorder" onClick={onReorder}>Reorder</button>
            <button data-testid="toolbar-remove" onClick={onRemovePages}>Remove</button>
            <button data-testid="toolbar-replacetext" onClick={onReplaceText}>ReplaceText</button>
            <button data-testid="toolbar-metadata" onClick={onMetadata}>Metadata</button>
            <button data-testid="toolbar-protect" onClick={onProtect}>Protect</button>
            <button data-testid="toolbar-undo" onClick={onUndo}>Undo</button>
            <button data-testid="toolbar-redo" onClick={onRedo}>Redo</button>
            <span data-testid="toolbar-page">{currentPage}/{totalPages}</span>
            <span data-testid="toolbar-zoom">{zoom}</span>
        </div>
    ),
}));

vi.mock("../../components/PdfViewer", () => ({
    default: ({ fileUrl, currentPage, totalPages, requiresPassword, passwordError, onUnlock, zoom, onPageChange, onTotalPagesChange }: any) => (
        <div data-testid="viewer" data-file-url={fileUrl || ""} data-requires-password={requiresPassword} data-password-error={passwordError || ""}>
            <button data-testid="viewer-unlock" onClick={() => onUnlock?.("pass123")}>Unlock</button>
            <button data-testid="viewer-page-change" onClick={() => onPageChange?.(3)}>Change Page</button>
            <button data-testid="viewer-total-change" onClick={() => onTotalPagesChange?.(10)}>Set Total 10</button>
        </div>
    ),
}));

vi.mock("../../components/AppLayout", () => ({
    default: ({ sidebar, toolbar, viewer }: any) => (
        <div data-testid="app-layout">
            {sidebar}
            {toolbar}
            {viewer}
        </div>
    ),
}));

// Mock dialogs
vi.mock("../../components/MergeDialog", () => ({
    default: ({ open, onClose, onMergeComplete }: any) => (
        open ? <div data-testid="merge-dialog">
            <button data-testid="merge-close" onClick={onClose}>Close Merge</button>
            <button data-testid="merge-complete" onClick={() => onMergeComplete?.({ id: "merged-id", original_filename: "merged.pdf", file_size: 500, page_count: 10, is_password_protected: false, created_at: "2026-01-01", updated_at: "2026-01-01" })}>Complete Merge</button>
        </div> : null
    ),
}));

vi.mock("../../components/SplitDialog", () => ({
    default: ({ open, onClose, onSuccess }: any) => (
        open ? <div data-testid="split-dialog">
            <button data-testid="split-close" onClick={onClose}>Close Split</button>
            <button data-testid="split-success" onClick={() => onSuccess?.()}>Success Split</button>
        </div> : null
    ),
}));

vi.mock("../../components/ReorderDialog", () => ({
    default: ({ open, onClose, onSuccess }: any) => (
        open ? <div data-testid="reorder-dialog">
            <button data-testid="reorder-close" onClick={onClose}>Close Reorder</button>
            <button data-testid="reorder-success" onClick={() => onSuccess?.()}>Success Reorder</button>
        </div> : null
    ),
}));

vi.mock("../../components/RemoveDialog", () => ({
    default: ({ open, onClose, onSuccess }: any) => (
        open ? <div data-testid="remove-dialog">
            <button data-testid="remove-close" onClick={onClose}>Close Remove</button>
            <button data-testid="remove-success" onClick={() => onSuccess?.()}>Success Remove</button>
        </div> : null
    ),
}));

vi.mock("../../components/MetadataDialog", () => ({
    default: ({ open, onClose, onSuccess }: any) => (
        open ? <div data-testid="metadata-dialog">
            <button data-testid="metadata-close" onClick={onClose}>Close Metadata</button>
            <button data-testid="metadata-success" onClick={() => onSuccess?.({ id: "meta-id", original_filename: "meta.pdf", file_size: 200, page_count: 5, is_password_protected: false, created_at: "2026-01-01", updated_at: "2026-01-01" })}>Success Metadata</button>
        </div> : null
    ),
}));

vi.mock("../../components/ReplaceTextDialog", () => ({
    default: ({ open, onClose }: any) => (
        open ? <div data-testid="replacetext-dialog">
            <button data-testid="replacetext-close" onClick={onClose}>Close ReplaceText</button>
        </div> : null
    ),
}));

vi.mock("../../components/ProtectDialog", () => ({
    default: ({ open, onClose }: any) => (
        open ? <div data-testid="protect-dialog">
            <button data-testid="protect-close" onClick={onClose}>Close Protect</button>
        </div> : null
    ),
}));

vi.mock("../../components/DeleteModal", () => ({
    default: ({ open, onClose, onConfirm, file }: any) => (
        open ? <div data-testid="delete-modal" data-file-id={file?.id || ""}>
            <button data-testid="delete-close" onClick={onClose}>Close Delete</button>
            <button data-testid="delete-confirm" onClick={onConfirm}>Confirm Delete</button>
        </div> : null
    ),
}));

const mockUser = {
    id: "1", email: "test@test.com", full_name: "Test User",
    is_active: true, is_admin: false, license_tier: "free",
    license_tier_source: "admin", created_at: "2026-01-01", updated_at: "2026-01-01",
};

const mockPdf = { id: "pdf-1", original_filename: "doc.pdf", file_size: 1234, page_count: 5, is_password_protected: false, created_at: "2026-01-01", updated_at: "2026-01-01" };
const mockProtectedPdf = { id: "pdf-1", original_filename: "protected.pdf", file_size: 1234, page_count: 5, is_password_protected: true, created_at: "2026-01-01", updated_at: "2026-01-01" };

beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser, loading: false });
    mockDownloadPdf.mockResolvedValue(new Blob(["test"], { type: "application/pdf" }));
    URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("EditorPage", () => {
    it("shows loading state", () => {
        mockUseAuth.mockReturnValue({ user: null, loading: true });
        render(<EditorPage />);
        expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("shows loading state when no user yet", () => {
        mockUseAuth.mockReturnValue({ user: null, loading: false });
        render(<EditorPage />);
        expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("renders layout when authenticated", () => {
        render(<EditorPage />);
        expect(screen.getByTestId("app-layout")).toBeInTheDocument();
        expect(screen.getByTestId("sidebar")).toBeInTheDocument();
        expect(screen.getByTestId("toolbar")).toBeInTheDocument();
        expect(screen.getByTestId("viewer")).toBeInTheDocument();
    });

    it("opens merge dialog when toolbar fires onMerge", () => {
        render(<EditorPage />);
        fireEvent.click(screen.getByTestId("toolbar-merge"));
        expect(screen.getByTestId("merge-dialog")).toBeInTheDocument();
    });

    it("opens split dialog", () => {
        render(<EditorPage />);
        fireEvent.click(screen.getByTestId("toolbar-split"));
        expect(screen.getByTestId("split-dialog")).toBeInTheDocument();
    });

    it("opens reorder dialog", () => {
        render(<EditorPage />);
        fireEvent.click(screen.getByTestId("toolbar-reorder"));
        expect(screen.getByTestId("reorder-dialog")).toBeInTheDocument();
    });

    it("opens remove pages dialog", () => {
        render(<EditorPage />);
        fireEvent.click(screen.getByTestId("toolbar-remove"));
        expect(screen.getByTestId("remove-dialog")).toBeInTheDocument();
    });

    it("opens metadata dialog", () => {
        render(<EditorPage />);
        fireEvent.click(screen.getByTestId("toolbar-metadata"));
        expect(screen.getByTestId("metadata-dialog")).toBeInTheDocument();
    });

    it("opens replace text dialog", () => {
        render(<EditorPage />);
        fireEvent.click(screen.getByTestId("toolbar-replacetext"));
        expect(screen.getByTestId("replacetext-dialog")).toBeInTheDocument();
    });

    it("opens protect dialog", () => {
        render(<EditorPage />);
        fireEvent.click(screen.getByTestId("toolbar-protect"));
        expect(screen.getByTestId("protect-dialog")).toBeInTheDocument();
    });

    it("closes dialogs properly", () => {
        render(<EditorPage />);
        fireEvent.click(screen.getByTestId("toolbar-merge"));
        expect(screen.getByTestId("merge-dialog")).toBeInTheDocument();
        fireEvent.click(screen.getByTestId("merge-close"));
        expect(screen.queryByTestId("merge-dialog")).not.toBeInTheDocument();
    });

    it("handleSelect loads PDF and creates blob URL", async () => {
        mockGetPdf.mockResolvedValue(mockPdf);
        render(<EditorPage />);
        fireEvent.click(screen.getByTestId("sidebar-select"));
        await waitFor(() => {
            expect(mockGetPdf).toHaveBeenCalledWith("pdf-1");
            expect(mockDownloadPdf).toHaveBeenCalledWith("pdf-1");
        });
        expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it("handleSelect handles protected PDF", async () => {
        mockGetPdf.mockResolvedValue(mockProtectedPdf);
        render(<EditorPage />);
        fireEvent.click(screen.getByTestId("sidebar-select"));
        await waitFor(() => {
            expect(mockGetPdf).toHaveBeenCalledWith("pdf-1");
        });
        const viewer = screen.getByTestId("viewer");
        expect(viewer.getAttribute("data-requires-password")).toBe("true");
    });

    it("handleUnlock calls unlockPdf then downloads", async () => {
        mockGetPdf.mockResolvedValue(mockProtectedPdf);
        render(<EditorPage />);
        // First select the protected PDF
        fireEvent.click(screen.getByTestId("sidebar-select"));
        await waitFor(() => expect(screen.getByTestId("viewer").getAttribute("data-requires-password")).toBe("true"));
        // Unlock - fire the viewer's unlock button (calls handleUnlock with "pass123")
        mockUnlockPdf.mockResolvedValue({ success: true });
        fireEvent.click(screen.getByTestId("viewer-unlock"));
        await waitFor(() => {
            expect(mockUnlockPdf).toHaveBeenCalledWith("pdf-1", "pass123");
            expect(mockDownloadPdf).toHaveBeenCalledWith("pdf-1");
        });
    });

    it("handleUnlock shows error on failure", async () => {
        mockGetPdf.mockResolvedValue(mockProtectedPdf);
        mockUnlockPdf.mockRejectedValue(new Error("Incorrect password"));
        render(<EditorPage />);
        fireEvent.click(screen.getByTestId("sidebar-select"));
        await waitFor(() => expect(screen.getByTestId("viewer").getAttribute("data-requires-password")).toBe("true"));
        fireEvent.click(screen.getByTestId("viewer-unlock"));
        await waitFor(() => {
            expect(screen.getByTestId("viewer").getAttribute("data-password-error")).toBe("Incorrect password");
        });
    });

    it("handleUndo restores previous version", async () => {
        mockGetPdf.mockResolvedValue(mockPdf);
        mockUndoPdf.mockResolvedValue({ id: "restored-id" });
        render(<EditorPage />);
        // Select first
        fireEvent.click(screen.getByTestId("sidebar-select"));
        await waitFor(() => expect(mockDownloadPdf).toHaveBeenCalled());
        // Undo via toolbar
        fireEvent.click(screen.getByTestId("toolbar-undo"));
        await waitFor(() => {
            expect(mockUndoPdf).toHaveBeenCalledWith("pdf-1");
        });
    });

    it("handleMerge opens merge dialog and merge complete refreshes sidebar", async () => {
        mockMergePdfs.mockResolvedValue({ id: "merged-result", original_filename: "merged.pdf" });
        mockDownloadPdf.mockResolvedValue(new Blob(["merged"], { type: "application/pdf" }));
        render(<EditorPage />);
        // Open merge dialog
        fireEvent.click(screen.getByTestId("toolbar-merge"));
        expect(screen.getByTestId("merge-dialog")).toBeInTheDocument();
        // Fire merge complete callback - should refresh sidebar
        fireEvent.click(screen.getByTestId("merge-complete"));
        await waitFor(() => {
            const sidebar = screen.getByTestId("sidebar");
            expect(sidebar.getAttribute("data-refresh-key")).toBe("1");
        });
    });

    it("handleSplit opens dialog and onSuccess refreshes sidebar", async () => {
        render(<EditorPage />);
        fireEvent.click(screen.getByTestId("toolbar-split"));
        expect(screen.getByTestId("split-dialog")).toBeInTheDocument();
        fireEvent.click(screen.getByTestId("split-success"));
        await waitFor(() => {
            const sidebar = screen.getByTestId("sidebar");
            expect(sidebar.getAttribute("data-refresh-key")).toBe("1");
        });
    });

    it("handleReorder opens dialog and onSuccess refreshes sidebar", async () => {
        render(<EditorPage />);
        fireEvent.click(screen.getByTestId("toolbar-reorder"));
        expect(screen.getByTestId("reorder-dialog")).toBeInTheDocument();
        fireEvent.click(screen.getByTestId("reorder-success"));
        await waitFor(() => {
            const sidebar = screen.getByTestId("sidebar");
            expect(sidebar.getAttribute("data-refresh-key")).toBe("1");
        });
    });

    it("handleRemove opens dialog and onSuccess refreshes sidebar", async () => {
        render(<EditorPage />);
        fireEvent.click(screen.getByTestId("toolbar-remove"));
        expect(screen.getByTestId("remove-dialog")).toBeInTheDocument();
        fireEvent.click(screen.getByTestId("remove-success"));
        await waitFor(() => {
            const sidebar = screen.getByTestId("sidebar");
            expect(sidebar.getAttribute("data-refresh-key")).toBe("1");
        });
    });

    it("handleMetadata opens dialog and onSuccess updates state and downloads", async () => {
        mockDownloadPdf.mockResolvedValue(new Blob(["meta"], { type: "application/pdf" }));
        render(<EditorPage />);
        fireEvent.click(screen.getByTestId("toolbar-metadata"));
        expect(screen.getByTestId("metadata-dialog")).toBeInTheDocument();
        fireEvent.click(screen.getByTestId("metadata-success"));
        await waitFor(() => {
            expect(mockDownloadPdf).toHaveBeenCalled();
        });
    });

    it("Upload flow: onUpload sets selectedId and refreshes sidebar", async () => {
        mockGetPdf.mockResolvedValue(mockPdf);
        render(<EditorPage />);
        fireEvent.click(screen.getByTestId("sidebar-upload"));
        // Sidebar refreshKey should increment
        const sidebar = screen.getByTestId("sidebar");
        expect(sidebar.getAttribute("data-refresh-key")).toBe("1");
    });

    it("Delete flow opens modal, confirm deletes, refreshes sidebar", async () => {
        mockGetPdf.mockResolvedValue(mockPdf);
        mockDeletePdf.mockResolvedValue(undefined);
        render(<EditorPage />);
        // Click delete to open modal
        fireEvent.click(screen.getByTestId("sidebar-delete-click"));
        expect(screen.getByTestId("delete-modal")).toBeInTheDocument();
        // Confirm delete
        await waitFor(() => {
            fireEvent.click(screen.getByTestId("delete-confirm"));
        });
        const sidebar = screen.getByTestId("sidebar");
        expect(sidebar.getAttribute("data-refresh-key")).toBe("1");
        expect(screen.queryByTestId("delete-modal")).not.toBeInTheDocument();
    });

    it("canUndo is false when no PDF selected", () => {
        render(<EditorPage />);
        const toolbar = screen.getByTestId("toolbar");
        expect(toolbar.getAttribute("data-can-undo")).toBe("false");
    });

    it("canUndo becomes true after PDF selected", async () => {
        mockGetPdf.mockResolvedValue(mockPdf);
        render(<EditorPage />);
        fireEvent.click(screen.getByTestId("sidebar-select"));
        await waitFor(() => {
            const toolbar = screen.getByTestId("toolbar");
            expect(toolbar.getAttribute("data-can-undo")).toBe("true");
        });
    });

    it("handleSelect skips re-selecting same PDF", async () => {
        mockGetPdf.mockResolvedValue(mockPdf);
        render(<EditorPage />);
        // Select once
        fireEvent.click(screen.getByTestId("sidebar-select"));
        await waitFor(() => expect(mockGetPdf).toHaveBeenCalledTimes(1));
        // Select same PDF again (onSelect callback with "pdf-1")
        fireEvent.click(screen.getByTestId("sidebar-select"));
        // Should NOT call getPdf again since selectedId is already "pdf-1"
        expect(mockGetPdf).toHaveBeenCalledTimes(1);
    });

    it("passes page/zoom info to viewer and toolbar", () => {
        mockGetPdf.mockResolvedValue(mockPdf);
        render(<EditorPage />);
        fireEvent.click(screen.getByTestId("sidebar-select"));
        // Simulate total pages change from viewer
        fireEvent.click(screen.getByTestId("viewer-total-change"));
        expect(screen.getByTestId("toolbar-page").textContent).toBe("1/10");
    });
});
