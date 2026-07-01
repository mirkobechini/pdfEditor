import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import Home from "./page";
import { useAuth } from "./lib/auth";
import { api } from "./lib/api";

// Mock auth
vi.mock("./lib/auth", () => ({
  useAuth: vi.fn(),
}));

// Mock API
vi.mock("./lib/api", () => ({
  api: {
    listPdfs: vi.fn(),
    getPdf: vi.fn(),
    downloadPdf: vi.fn(),
    undoPdf: vi.fn(),
    redoPdf: vi.fn(),
    deletePdf: vi.fn(),
    uploadPdf: vi.fn(),
    unlockPdf: vi.fn(),
    setToken: vi.fn(),
  },
}));

// Mock matchMedia for HeaderControls dark mode
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock URL.createObjectURL / revokeObjectURL
URL.createObjectURL = vi.fn(() => "blob:http://localhost/test");
URL.revokeObjectURL = vi.fn();

// Mock child components to isolate Home's logic
vi.mock("./components/AppLayout", () => ({
  default: ({ sidebar, toolbar, viewer }: any) => (
    <div data-testid="app-layout">
      {sidebar}
      {toolbar}
      {viewer}
    </div>
  ),
}));

// Mock Toolbar to expose onUndo/onRedo callbacks as clickable buttons
vi.mock("./components/Toolbar", () => ({
  default: ({ onUndo, onRedo, canUndo }: any) => (
    <div data-testid="toolbar">
      <button
        data-testid="undo-btn"
        disabled={!canUndo}
        onClick={onUndo}
      >
        ↩
      </button>
      <button
        data-testid="redo-btn"
        disabled={!canUndo}
        onClick={onRedo}
      >
        ↪
      </button>
    </div>
  ),
}));

// Mock Sidebar to allow selecting a PDF
vi.mock("./components/Sidebar", () => ({
  default: ({ onSelect }: any) => (
    <div data-testid="sidebar">
      <button
        data-testid="select-pdf-btn"
        onClick={() =>
          onSelect("test-pdf-id")
        }
      >
        Select PDF
      </button>
    </div>
  ),
}));

vi.mock("./components/PdfViewer", () => ({
  default: () => <div data-testid="viewer" />,
}));

vi.mock("./components/MergeDialog", () => ({
  default: () => null,
}));
vi.mock("./components/SplitDialog", () => ({
  default: () => null,
}));
vi.mock("./components/ReorderDialog", () => ({
  default: () => null,
}));
vi.mock("./components/RemoveDialog", () => ({
  default: () => null,
}));
vi.mock("./components/DeleteModal", () => ({
  default: () => null,
}));

const mockPdf = {
  id: "test-pdf-id",
  original_filename: "test.pdf",
  file_size: 1000,
  page_count: 3,
  is_password_protected: false,
  title: null,
  author: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const mockBlob = new Blob(["dummy-content"], { type: "application/pdf" });

const mockUser = {
  id: "1",
  email: "test@example.com",
  full_name: "Test User",
  is_active: true,
  is_admin: false,
  license_tier: "free",
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();

  // Default mock: user logged in
  (useAuth as any).mockReturnValue({
    user: mockUser,
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    googleLogin: vi.fn(),
    logout: vi.fn(),
    token: "fake-token",
  });

  // Mock API defaults
  (api.getPdf as any).mockResolvedValue(mockPdf);
  (api.downloadPdf as any).mockResolvedValue(mockBlob);
  (api.listPdfs as any).mockResolvedValue({ items: [mockPdf], total: 1 });
});

describe("Home - undo/redo silent error handling", () => {
  it("does not console.error when undo has no snapshots (Nothing to undo)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    (api.undoPdf as any).mockRejectedValue(new Error("Nothing to undo"));

    render(<Home />);

    // First select a PDF so undo is enabled
    const selectBtn = await screen.findByTestId("select-pdf-btn");
    await act(async () => {
      selectBtn.click();
    });

    // Now click undo
    const undoBtn = await screen.findByTestId("undo-btn");
    await act(async () => {
      undoBtn.click();
    });

    // Wait for microtasks
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("does not console.error when redo has no snapshots (Nothing to redo)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    (api.redoPdf as any).mockRejectedValue(new Error("Nothing to redo"));

    render(<Home />);

    // First select a PDF so redo is enabled
    const selectBtn = await screen.findByTestId("select-pdf-btn");
    await act(async () => {
      selectBtn.click();
    });

    // Now click redo
    const redoBtn = await screen.findByTestId("redo-btn");
    await act(async () => {
      redoBtn.click();
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("still logs console.error for genuine undo failures", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    (api.undoPdf as any).mockRejectedValue(new Error("PDF not found"));

    render(<Home />);

    const selectBtn = await screen.findByTestId("select-pdf-btn");
    await act(async () => {
      selectBtn.click();
    });

    const undoBtn = await screen.findByTestId("undo-btn");
    await act(async () => {
      undoBtn.click();
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(errorSpy).toHaveBeenCalledWith("Undo failed:", expect.any(Error));
    errorSpy.mockRestore();
  });

  it("still logs console.error for genuine redo failures", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    (api.redoPdf as any).mockRejectedValue(new Error("PDF not found"));

    render(<Home />);

    const selectBtn = await screen.findByTestId("select-pdf-btn");
    await act(async () => {
      selectBtn.click();
    });

    const redoBtn = await screen.findByTestId("redo-btn");
    await act(async () => {
      redoBtn.click();
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(errorSpy).toHaveBeenCalledWith("Redo failed:", expect.any(Error));
    errorSpy.mockRestore();
  });
});
