/**
 * Client API factory (issue #883 A1, Tranche 3 #912).
 *
 * Unico punto di creazione dell'ApiClient in shared/: `createApiClient(adapter)`
 * con strategy di trasporto iniettata. L'adapter di default replica il fetch
 * attuale (credential include), `webCsrfAdapter` aggiunge il pre-fetch CSRF
 * per le richieste di scrittura in cross-origin (comportamento del vecchio
 * WebApiClient, ora formale e testabile senza `globalThis.fetch = vi.fn()`).
 */
import { ApiClient } from "./api";
import type { ApiAdapter } from "./api";

/** Adapter di default: trasporto HTTP standard con credential include. */
export const defaultAdapter: ApiAdapter = {
  async fetch(_client, url, options) {
    return fetch(url, options);
  },
};

/**
 * Adapter web con CSRF pre-fetch: per POST/PUT/DELETE/PATCH senza token in
 * memoria, chiede prima /auth/csrf (GET, nessuna ricorsione) così il cookie
 * cross-origin viaggia con l'header X-CSRF-Token corretto.
 */
export const webCsrfAdapter: ApiAdapter = {
  async beforeFetch(client) {
    await client.refreshCsrf();
  },
  async fetch(_client, url, options) {
    return fetch(url, options);
  },
};

/** Crea un ApiClient con l'adapter di trasporto dato (default se assente). */
export function createApiClient(
  adapter: ApiAdapter = defaultAdapter,
  baseUrl?: string,
): ApiClient {
  return new ApiClient(baseUrl, adapter);
}