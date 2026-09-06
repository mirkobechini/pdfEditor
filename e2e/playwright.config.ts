import { defineConfig, devices } from "@playwright/test";

/**
 * E2E test configuration for PdfEditor.
 *
 * The web server starts the FastAPI backend (with a test SQLite DB) and the
 * Next.js frontend. Tests run against the real cross-origin flow.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  timeout: 60000,

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: [
    {
      // FastAPI backend on a test SQLite DB
      command:
        "cd ../backend && set DATABASE_URL=sqlite:///./e2e_test.db&& python -m uvicorn app.main:app --host 127.0.0.1 --port 8000",
      url: "http://127.0.0.1:8000/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      // Next.js frontend
      command: "cd ../frontend && npm run dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
