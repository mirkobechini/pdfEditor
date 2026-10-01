/**
 * Web API client — thin subclass of the single shared client (issue #883, A1).
 *
 * All method definitions and the public surface live in shared/src/api.ts
 * (copied to src/shared/ by the prebuild script). This module only overrides
 * `_fetch` to add the web-specific cross-origin CSRF pre-fetch behavior, then
 * re-exports the shared surface unchanged so existing call sites keep working.
 */
import { ApiClient as BaseApiClient } from "../../shared/api";

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

// Re-export the shared public surface. `api` uses the web subclass so web
// cross-origin CSRF behavior is preserved; `ApiClient` remains usable for the
// static `extractError` helper and instanceof checks.
export {
  ApiClient,
  cloudApi,
  startKeepWarm,
  stopKeepWarm,
} from "../../shared/api";
export type {
  PdfDocument,
  PdfListResponse,
  Metadata,
  BugReport,
  AdminUser,
  UserResponse,
  AuthResponse,
  ShareLink,
  OcrResult,
} from "../../shared/api";

/** Singleton web client instance with CSRF pre-fetch adapter. */
export const api = new WebApiClient();