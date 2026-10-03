/**
 * Web API client — thin subclass of the single shared client (issue #883, A1 — Tranche 2 #910).
 *
 * All method definitions and the public surface live in shared/src/api.ts
 * (copied to src/shared/ by the prebuild script). This module only overrides
 * `_fetch` to add the web-specific cross-origin CSRF pre-fetch behavior, then
 * re-exports the shared surface unchanged so existing call sites keep working.
 *
 * Tranche 2 (issue #910): BOTH singletons (`api` and `cloudApi`) are wrapped in
 * the CSRF adapter. The first A1 attempt re-exported `cloudApi` naked and the
 * web login flow (which routes through cloudApi on the cloud path) lost the
 * CSRF pre-fetch → 403 cross-origin. Here every web instance has the adapter.
 */
import { getApiBaseUrl, getCloudApiBaseUrl } from "./tauri";
import { ApiClient as BaseApiClient } from "../../shared/api";

const API_BASE = getApiBaseUrl();

import type {
  PdfDocument,
  PdfListResponse,
  Metadata,
  BugReport,
  AdminUser,
  ShareLink,
  OcrResult,
} from "./api-types";

export type {
  PdfDocument,
  PdfListResponse,
  Metadata,
  BugReport,
  AdminUser,
  ShareLink,
  OcrResult,
};

export class WebApiClient extends BaseApiClient {
  private _refreshingCsrf = false;

  protected override async _fetch(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    // For state-changing requests (POST/PUT/DELETE/PATCH) in a cross-origin
    // context, the in-memory csrf_token may be null after a page reload while the
    // backend still has the csrf_token cookie. Ensure we have a token by fetching
    // /auth/csrf once before proceeding (a GET, so no recursion into _fetch here).
    const method = (options.method || "GET").toUpperCase();
    if (
      ["POST", "PUT", "DELETE", "PATCH"].includes(method) &&
      !this._getCsrfToken() &&
      !this._refreshingCsrf
    ) {
      this._refreshingCsrf = true;
      try {
        await this.refreshCsrf();
      } finally {
        this._refreshingCsrf = false;
      }
    }
    const headers = {
      ...this.getHeaders(),
      ...((options.headers as Record<string, string>) || {}),
    };
    return fetch(url, {
      ...options,
      credentials: "include",
      headers,
    });
  }
}

// Re-export the shared public surface. `ApiClient` stays exported for the
// static `extractError` helper and instanceof checks.
export { ApiClient } from "../../shared/api";

/** Singleton web client instance with CSRF pre-fetch adapter. */
export const api = new WebApiClient();

/** Cloud API client (auth via Render/Neon) — SAME CSRF adapter. */
export const cloudApi = new WebApiClient(getCloudApiBaseUrl());

// ─── Keep-warm: evita cold start del backend su Render ──────────────

let _keepWarmTimer: ReturnType<typeof setInterval> | null = null;
const KEEP_WARM_INTERVAL = 5 * 60 * 1000; // 5 minuti

/**
 * Avvia il ping periodico al backend cloud per evitare il cold start.
 * Il ping va a /health che è leggero e non richiede autenticazione.
 */
export function startKeepWarm(): void {
  if (_keepWarmTimer) return; // già avviato
  const url = `${API_BASE}/health`;
  const ping = () => {
    fetch(url).catch(() => {
      // Ignora errori di rete — il backend potrebbe essere in cold start
    });
  };
  ping(); // ping immediato all'avvio
  _keepWarmTimer = setInterval(ping, KEEP_WARM_INTERVAL);
}

/** Ferma il keep-warm (utile per test o cleanup) */
export function stopKeepWarm(): void {
  if (_keepWarmTimer) {
    clearInterval(_keepWarmTimer);
    _keepWarmTimer = null;
  }
}