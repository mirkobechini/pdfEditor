/**
 * Web API client — created via the shared factory (issue #883, A1 — Tranche 3 #912).
 *
 * All method definitions and the public surface live in shared/src/api.ts
 * (copied to src/shared/ by the prebuild script). This module only wires the
 * web-specific CSRF adapter (pre-fetch /auth/csrf su richieste di scrittura in
 * cross-origin) e re-esporta la superficie pubblica invariata.
 *
 * Tranche 3: le istanze web nascono da `createApiClient(webCsrfAdapter)` —
 * unico punto di creazione in shared/; il trasporto diventa una strategy
 * iniettata (testabile senza `globalThis.fetch = vi.fn()`).
 */
import { getApiBaseUrl, getCloudApiBaseUrl } from "./tauri";
import { ApiClient } from "../../shared/api";
import { createApiClient, webCsrfAdapter } from "../../shared/client";

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

/** Compat alias: il client web è ora creato via factory (#912). */
export class WebApiClient extends ApiClient {
  constructor(baseUrl?: string) {
    super(baseUrl, webCsrfAdapter);
  }
}

// Re-export della classe per extractError statico e instanceof checks.
export { ApiClient } from "../../shared/api";

/** Singleton web client instance with CSRF pre-fetch adapter. */
export const api = createApiClient(webCsrfAdapter);

/** Cloud API client (auth via Render/Neon) — SAME CSRF adapter. */
export const cloudApi = createApiClient(webCsrfAdapter, getCloudApiBaseUrl());

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