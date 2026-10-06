import { defineConfig } from "@playwright/test";

/**
 * E2E desktop — opzione 1 (Sidecar/API-first, issue #917).
 *
 * Avvia SOLO il backend FastAPI in modalita' desktop (DB SQLite + DEBUG,
 * stessa config del sidecar PyInstaller locale), senza la shell Tauri.
 * I test parlano direttamente all'API su 127.0.0.1:8001.
 *
 * Porta dedicata (8001) per non collidere col web e2e (8000)/frontend (3000).
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  timeout: 45000,

  use: {
    baseURL: "http://127.0.0.1:8001",
    trace: "on-first-retry",
  },

  webServer: [
    {
      // Backend FastAPI con DB SQLite locale (config desktop/sidecar)
      command:
        "cd ../backend && " +
        (process.platform === "win32" ? "cross-env " : "") +
        "DATABASE_URL=sqlite:///./e2e_desktop_test.db DEBUG=true " +
        "DISABLE_LICENSE_ENFORCEMENT=true DISABLE_CSRF=true " +
        (process.env.PYTHON || "./.venv/bin/python") +
        " -m uvicorn app.main:app --host 127.0.0.1 --port 8001",
      url: "http://127.0.0.1:8001/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
