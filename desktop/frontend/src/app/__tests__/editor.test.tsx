import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));
vi.mock("../../shared/api", () => ({
  api: {
    listPdfs: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    downloadPdf: vi.fn().mockResolvedValue(new Blob()),
    refreshCsrf: vi.fn(),
  },
}));
vi.mock("../../shared/auth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("../../shared/tauri", () => ({ isTauri: () => true, tauriInvoke: vi.fn(), getApiBaseUrl: () => "http://127.0.0.1:7723" }));
vi.mock("../../lib/preferences", () => ({ usePreferences: () => ({ prefs: { default_zoom: 100, theme: "dark", language: "it", antialiasing: true, density: "comfortable" }, updatePrefs: vi.fn() }) }));

import EditorPage from "../app/page";

describe("EditorPage", () => {
  it("renders without crashing", () => {
    const { container } = render(<EditorPage />);
    expect(container).toBeTruthy();
  });
});
