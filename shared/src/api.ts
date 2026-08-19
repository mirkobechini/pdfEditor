import { getApiBaseUrl, getCloudApiBaseUrl } from "./tauri";
import type {
  PdfDocument,
  PdfListResponse,
  Metadata,
  BugReport,
  AdminUser,
  UserResponse,
  AuthResponse,
} from "./types";

export type {
  PdfDocument,
  PdfListResponse,
  Metadata,
  BugReport,
  AdminUser,
  UserResponse,
  AuthResponse,
};

export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private _csrfToken: string | null = null;
  private _isRefreshing = false;
  /** Callback invoked when a token refresh succeeds */
  onTokenRefreshed: ((token: string, csrfToken: string) => void) | null = null;
  /** Callback invoked when a token refresh fails */
  onTokenRefreshFailed: (() => void) | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? getApiBaseUrl();
  }

  /** Get current token (needed to sync between local and cloud clients). */
  getToken(): string | null {
    return this.token;
  }

  static async extractError(res: Response): Promise<string> {
    // Rate limit — user-friendly message
    if (res.status === 429) {
      return JSON.stringify({
        code: "RATE_LIMIT",
        detail: "Too many requests",
      });
    }
    try {
      const body = await res.json();
      // New format: {code, detail} from backend error_response helper
      if (body && typeof body === "object" && body.code && body.detail) {
        return JSON.stringify(body);
      }
      if (typeof body.detail === "string") return body.detail;
      if (Array.isArray(body.detail))
        return body.detail[0]?.msg || res.statusText;
      return JSON.stringify(body);
    } catch {
      return res.statusText;
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    // Include Bearer token if available (used in local dev where cookie is cross-origin)
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    // Include CSRF token for state-changing requests (double-submit pattern)
    const csrfToken = this._getCsrfToken();
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }
    return headers;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  setCsrfToken(token: string | null) {
    this._csrfToken = token;
  }

  private _getCsrfToken(): string | null {
    // Try in-memory first (works cross-origin where document.cookie is unreadable)
    if (this._csrfToken) return this._csrfToken;
    // Fallback to cookie (same-origin)
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
    return match ? match[1] : null;
  }

  private async _fetch(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const headers = {
      ...this.getHeaders(),
      ...((options.headers as Record<string, string>) || {}),
    };
    const res = await fetch(url, {
      ...options,
      credentials: "include",
      headers,
    });

    // Auto-refresh on 401/INVALID_CREDENTIALS
    if (res.status === 401 && !this._isRefreshing) {
      const body = await res
        .clone()
        .json()
        .catch(() => null);
      const detail = typeof body?.detail === "string" ? body.detail : "";
      if (detail === "INVALID_CREDENTIALS" || detail.includes("expired")) {
        this._isRefreshing = true;
        const refreshed = await this.refreshToken().catch(() => null);
        this._isRefreshing = false;
        if (refreshed) {
          // Retry the original request with the new token
          const retryHeaders = {
            ...this.getHeaders(),
            ...((options.headers as Record<string, string>) || {}),
          };
          return fetch(url, {
            ...options,
            credentials: "include",
            headers: retryHeaders,
          });
        }
      }
    }

    return res;
  }

  // ─── PDF endpoints ───────────────────────────────────────────────

  async uploadPdf(file: File): Promise<PdfDocument> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await this._fetch(`${this.baseUrl}/pdfs/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async uploadPdfWithProgress(
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<PdfDocument> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${this.baseUrl}/pdfs/upload`);
      xhr.withCredentials = true;

      if (this.token) {
        xhr.setRequestHeader("Authorization", `Bearer ${this.token}`);
      }

      const csrfToken = this._getCsrfToken();
      if (csrfToken) {
        xhr.setRequestHeader("X-CSRF-Token", csrfToken);
      }

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          let message = xhr.statusText;
          try {
            const body = JSON.parse(xhr.responseText);
            if (typeof body.detail === "string") message = body.detail;
            else if (Array.isArray(body.detail) && body.detail[0]?.msg)
              message = body.detail[0].msg;
          } catch {
            // Non-JSON response — use statusText
          }
          reject(new Error(message));
        }
      };

      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(formData);
    });
  }

  async listPdfs(skip = 0, limit = 100): Promise<PdfListResponse> {
    const res = await this._fetch(
      `${this.baseUrl}/pdfs?skip=${skip}&limit=${limit}`,
      { headers: this.getHeaders() },
    );
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async getPdf(id: string): Promise<PdfDocument> {
    const res = await this._fetch(`${this.baseUrl}/pdfs/${id}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async deletePdf(id: string): Promise<void> {
    const res = await this._fetch(`${this.baseUrl}/pdfs/${id}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
  }

  async downloadPdf(id: string): Promise<Blob> {
    const res = await this._fetch(`${this.baseUrl}/pdfs/${id}/download`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.blob();
  }

  // ─── Merge / Split / Reorder ─────────────────────────────────────

  async mergePdfs(
    pdfIds: string[],
    outputFilename?: string,
  ): Promise<PdfDocument> {
    const body: Record<string, unknown> = { pdf_ids: pdfIds };
    if (outputFilename) body.output_filename = outputFilename;
    const res = await this._fetch(`${this.baseUrl}/pdfs/merge`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async splitPdf(
    id: string,
    mode: "every" | "range",
    ranges?: string[],
    outputFilename?: string,
    outputFilenames?: string[],
  ) {
    const body: Record<string, unknown> = { mode };
    if (ranges) body.ranges = ranges;
    if (outputFilename) body.output_filename = outputFilename;
    if (outputFilenames) body.output_filenames = outputFilenames;
    const res = await this._fetch(`${this.baseUrl}/pdfs/${id}/split`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async reorderPages(
    id: string,
    pageOrder: number[],
    outputFilename?: string,
    overwrite?: boolean,
  ): Promise<PdfDocument> {
    const body: Record<string, unknown> = { page_order: pageOrder };
    if (outputFilename) body.output_filename = outputFilename;
    if (overwrite) body.overwrite = true;
    const res = await this._fetch(`${this.baseUrl}/pdfs/${id}/reorder`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async removePages(
    id: string,
    pageNumbers: number[],
    outputFilename?: string,
    overwrite?: boolean,
  ): Promise<PdfDocument> {
    const body: Record<string, unknown> = { page_numbers: pageNumbers };
    if (outputFilename) body.output_filename = outputFilename;
    if (overwrite) body.overwrite = true;
    const res = await this._fetch(`${this.baseUrl}/pdfs/${id}/remove-pages`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  // ─── Text ────────────────────────────────────────────────────────

  async replaceText(
    id: string,
    search: string,
    replace: string,
    occurrence?: number,
    outputFilename?: string,
  ): Promise<PdfDocument> {
    const body: Record<string, unknown> = { search, replace };
    if (occurrence !== undefined) body.occurrence = occurrence;
    if (outputFilename) body.output_filename = outputFilename;
    const res = await this._fetch(`${this.baseUrl}/pdfs/${id}/replace-text`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async extractText(
    id: string,
    page?: number,
  ): Promise<{ text: string; pages: number }> {
    const params = page ? `?page=${page}` : "";
    const res = await this._fetch(`${this.baseUrl}/pdfs/${id}/text${params}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  // ─── Metadata ────────────────────────────────────────────────────

  async getMetadata(id: string): Promise<Metadata> {
    const res = await this._fetch(`${this.baseUrl}/pdfs/${id}/metadata`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async updateMetadata(
    id: string,
    metadata: Partial<Metadata> & {
      new_filename?: string;
      overwrite?: boolean;
    },
  ): Promise<PdfDocument> {
    const res = await this._fetch(`${this.baseUrl}/pdfs/${id}/metadata`, {
      method: "PUT",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(metadata),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  // ─── Password ────────────────────────────────────────────────────

  async unlockPdf(id: string, password: string): Promise<PdfDocument> {
    const res = await this._fetch(`${this.baseUrl}/pdfs/${id}/unlock`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async protectPdf(id: string, password: string): Promise<PdfDocument> {
    const res = await this._fetch(`${this.baseUrl}/pdfs/${id}/protect`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  // ─── Export / Import ─────────────────────────────────────────────

  async exportPdf(id: string, format: string): Promise<Blob> {
    const res = await this._fetch(
      `${this.baseUrl}/pdfs/${id}/export?fmt=${format}`,
      { method: "POST", headers: this.getHeaders() },
    );
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.blob();
  }

  async importFile(file: File): Promise<PdfDocument> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await this._fetch(`${this.baseUrl}/pdfs/import`, {
      method: "POST",
      headers: this.getHeaders(),
      body: formData,
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  // ─── Auth ────────────────────────────────────────────────────────

  async register(
    email: string,
    password: string,
    fullName: string,
  ): Promise<AuthResponse> {
    const res = await this._fetch(`${this.baseUrl}/auth/register`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    const data = await res.json();
    if (data.csrf_token) this.setCsrfToken(data.csrf_token);
    return data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await this._fetch(`${this.baseUrl}/auth/login`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    const data = await res.json();
    if (data.csrf_token) this.setCsrfToken(data.csrf_token);
    return data;
  }

  async googleLogin(idToken: string): Promise<AuthResponse> {
    const res = await this._fetch(`${this.baseUrl}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: idToken }),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    const data = await res.json();
    if (data.csrf_token) this.setCsrfToken(data.csrf_token);
    return data;
  }

  async guestLogin(): Promise<AuthResponse & { user: UserResponse }> {
    const res = await this._fetch(`${this.baseUrl}/auth/guest`, {
      method: "POST",
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    const data = await res.json();
    if (data.csrf_token) this.setCsrfToken(data.csrf_token);
    return data;
  }

  async convertGuest(
    email: string,
    password: string,
    fullName: string,
  ): Promise<AuthResponse> {
    const res = await this._fetch(`${this.baseUrl}/auth/guest/convert`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    const data = await res.json();
    if (data.csrf_token) this.setCsrfToken(data.csrf_token);
    return data;
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const res = await this._fetch(`${this.baseUrl}/auth/forgot-password`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<UserResponse> {
    const res = await this._fetch(`${this.baseUrl}/auth/reset-password`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ token, new_password: newPassword }),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async getMe(): Promise<UserResponse> {
    const res = await this._fetch(`${this.baseUrl}/auth/me`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async refreshCsrf(): Promise<void> {
    try {
      const res = await this._fetch(`${this.baseUrl}/auth/csrf`, {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.csrf_token) this.setCsrfToken(data.csrf_token);
      }
    } catch {
      // Non-critical
    }
  }

  async refreshToken(): Promise<{
    access_token: string;
    csrf_token: string;
  } | null> {
    try {
      // Use raw fetch to avoid triggering the auto-refresh loop
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: this.getHeaders(),
        credentials: "include",
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.csrf_token) this.setCsrfToken(data.csrf_token);
      this.setToken(data.access_token);
      // Notify auth context to persist the new token
      if (this.onTokenRefreshed) {
        this.onTokenRefreshed(data.access_token, data.csrf_token || "");
      }
      return data;
    } catch {
      if (this.onTokenRefreshFailed) {
        this.onTokenRefreshFailed();
      }
      return null;
    }
  }

  async syncUser(user: {
    id: string;
    email: string;
    full_name: string;
    password?: string;
    is_active: boolean;
    is_admin: boolean;
    is_guest: boolean;
    license_tier: string;
    license_tier_source: string;
    google_id?: string | null;
    created_at?: string;
    updated_at?: string;
  }): Promise<{ access_token: string; csrf_token: string } | null> {
    try {
      // Usa fetch diretto (non _fetch) per evitare di mandare il JWT cloud
      // che il sidecar non riconosce, innescando il loop 401 → refresh → fail
      const res = await fetch(`${this.baseUrl}/auth/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.access_token) this.setToken(data.access_token);
      if (data.csrf_token) this.setCsrfToken(data.csrf_token);
      return data;
    } catch {
      return null;
    }
  }

  async updateProfile(data: { full_name: string }): Promise<UserResponse> {
    const res = await this._fetch(`${this.baseUrl}/auth/me`, {
      method: "PUT",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async unlinkGoogle(password: string): Promise<UserResponse> {
    const res = await this._fetch(`${this.baseUrl}/auth/unlink/google`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async logout(): Promise<void> {
    await this._fetch(`${this.baseUrl}/auth/logout`, { method: "POST" });
  }

  async getPreferences(): Promise<{
    theme: string;
    language: string;
    default_zoom: number;
    antialiasing: boolean;
    density: string;
  }> {
    const res = await this._fetch(`${this.baseUrl}/settings/`, {
      headers: this.getHeaders(),
    });
    if (!res.ok)
      return {
        theme: "dark",
        language: "it",
        default_zoom: 100,
        antialiasing: true,
        density: "comfortable",
      };
    return res.json();
  }

  async updatePreferences(prefs: {
    theme?: string;
    language?: string;
    default_zoom?: number;
    antialiasing?: boolean;
    density?: string;
  }): Promise<{
    theme: string;
    language: string;
    default_zoom: number;
    antialiasing: boolean;
    density: string;
  } | null> {
    try {
      const res = await this._fetch(`${this.baseUrl}/settings/`, {
        method: "PUT",
        headers: { ...this.getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  // ─── Undo / Redo ─────────────────────────────────────────────────

  async undoPdf(id: string): Promise<PdfDocument> {
    const res = await this._fetch(`${this.baseUrl}/pdfs/${id}/undo`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: "{}",
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async redoPdf(id: string): Promise<PdfDocument> {
    const res = await this._fetch(`${this.baseUrl}/pdfs/${id}/redo`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: "{}",
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  // ─── Bug reports ─────────────────────────────────────────────────

  async createBugReport(
    title: string,
    description: string,
    pageUrl?: string,
  ): Promise<BugReport> {
    const body: Record<string, string> = { title, description };
    if (pageUrl) body.page_url = pageUrl;
    const res = await this._fetch(`${this.baseUrl}/bugs`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async listBugReports(): Promise<{ items: BugReport[]; total: number }> {
    const res = await this._fetch(`${this.baseUrl}/bugs`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  // ─── Admin ───────────────────────────────────────────────────────

  async adminListUsers(): Promise<AdminUser[]> {
    const res = await this._fetch(`${this.baseUrl}/admin/users`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async adminUpdateUser(
    userId: string,
    data: { is_active?: boolean; is_admin?: boolean; license_tier?: string },
  ): Promise<AdminUser> {
    const res = await this._fetch(`${this.baseUrl}/admin/users/${userId}`, {
      method: "PUT",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async adminSendResetEmail(userId: string): Promise<{ message: string }> {
    const res = await this._fetch(
      `${this.baseUrl}/admin/users/${userId}/send-reset`,
      { method: "POST", headers: this.getHeaders() },
    );
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }
}

/** Singleton instance for PDF operations (local sidecar) */
export const api = new ApiClient();

/** Cloud API client for auth (register/login via Render/Neon) */
export const cloudApi = new ApiClient(getCloudApiBaseUrl());
