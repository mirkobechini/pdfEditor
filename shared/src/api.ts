import { getApiBaseUrl, getCloudApiBaseUrl } from "./tauri";
import type {
  PdfDocument,
  PdfListResponse,
  Metadata,
  BugReport,
  AdminUser,
  UserResponse,
  AuthResponse,
  ShareLink,
  OcrResult,
  TextExtraction,
  UpdateMetadataRequest,
  AddAnnotationRequest,
  TokenPair,
  SyncUserRequest,
  Preferences,
  PreferencesUpdate,
  LicenseFeature,
  AdminUserUpdate,
  ListResult,
  MessageResponse,
} from "./types";

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
  TextExtraction,
  UpdateMetadataRequest,
  AddAnnotationRequest,
  TokenPair,
  SyncUserRequest,
  Preferences,
  PreferencesUpdate,
  LicenseFeature,
  AdminUserUpdate,
  ListResult,
  MessageResponse,
};

/**
 * Strategy di trasporto iniettata in ApiClient (issue #883, Tranche 3 #912).
 * - `beforeFetch`: hook opzionale eseguito PRIMA della richiesta (es. pre-fetch CSRF).
 * - `fetch`: esegue il trasporto HTTP. Riceve url e opzioni già complete (headers + credentials).
 */
export interface ApiAdapter {
  beforeFetch?(
    client: ApiClient,
    url: string,
    options: RequestInit,
  ): Promise<void>;
  fetch(
    client: ApiClient,
    url: string,
    options: RequestInit,
  ): Promise<Response>;
}

export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private _csrfToken: string | null = null;
  private _isRefreshing = false;
  private _refreshingCsrf = false;
  private readonly _adapter?: ApiAdapter;
  /** Callback invoked when a token refresh succeeds */
  onTokenRefreshed: ((token: string, csrfToken: string) => void) | null = null;
  /** Callback invoked when a token refresh fails */
  onTokenRefreshFailed: (() => void) | null = null;

  constructor(baseUrl?: string, adapter?: ApiAdapter) {
    this.baseUrl = baseUrl ?? getApiBaseUrl();
    this._adapter = adapter;
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
      // FastAPI wraps it as {detail: {code, detail}}, so check both levels
      const errDetail =
        body.detail && typeof body.detail === "object" ? body.detail : body;
      if (errDetail && errDetail.code && errDetail.detail) {
        return JSON.stringify({
          code: errDetail.code,
          detail: errDetail.detail,
        });
      }
      if (typeof body.detail === "string") return body.detail;
      if (Array.isArray(body.detail))
        return body.detail[0]?.msg || res.statusText;
      return JSON.stringify(body);
    } catch {
      return res.statusText;
    }
  }

  protected getHeaders(): Record<string, string> {
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

  protected _getCsrfToken(): string | null {
    // Try in-memory first (works cross-origin where document.cookie is unreadable)
    if (this._csrfToken) return this._csrfToken;
    // Fallback to cookie (same-origin)
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
    return match ? match[1] : null;
  }

  protected async _fetch(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const adapter = this._adapter;
    if (adapter) {
      // Con adapter: prima il hook CSRF (solo per richieste di scrittura senza
      // token in memoria, con guardia anti-ricorsione), poi trasporto adapter.
      const method = (options.method || "GET").toUpperCase();
      if (
        ["POST", "PUT", "DELETE", "PATCH"].includes(method) &&
        !this._getCsrfToken() &&
        !this._refreshingCsrf
      ) {
        this._refreshingCsrf = true;
        try {
          await adapter.beforeFetch?.(this, url, options);
        } finally {
          this._refreshingCsrf = false;
        }
      }
      const headers = {
        ...this.getHeaders(),
        ...((options.headers as Record<string, string>) || {}),
      };
      return adapter.fetch(this, url, {
        ...options,
        credentials: "include",
        headers,
      });
    }

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

  // ─── Helpers condivisi (collassano il boilerplate HTTP ripetuto) ────

  /** GET + parse JSON (throw su errore). */
  protected async _get<T = any>(url: string): Promise<T> {
    return this._request<T>(url, { headers: this.getHeaders() });
  }

  /** Richiesta generica + parse JSON (throw su errore). */
  protected async _request<T = any>(
    url: string,
    init: RequestInit = {},
  ): Promise<T> {
    const res = await this._fetch(url, init);
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  /** POST con body JSON (throw su errore). */
  protected async _postJson<T = any>(url: string, body?: unknown): Promise<T> {
    const init: RequestInit = {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
    };
    if (body !== undefined) init.body = JSON.stringify(body);
    return this._request<T>(url, init);
  }

  /** PUT con body JSON (throw su errore). */
  protected async _putJson<T = any>(url: string, body?: unknown): Promise<T> {
    const init: RequestInit = {
      method: "PUT",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
    };
    if (body !== undefined) init.body = JSON.stringify(body);
    return this._request<T>(url, init);
  }

  /** DELETE (throw su errore, restituisce void). */
  protected async _delete(url: string): Promise<void> {
    const res = await this._fetch(url, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
  }

  /** GET blob (throw su errore). */
  protected async _blob(url: string): Promise<Blob> {
    const res = await this._fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.blob();
  }

  // ─── PDF endpoints ───────────────────────────────────────────────

  async uploadPdf(file: File): Promise<PdfDocument> {
    const formData = new FormData();
    formData.append("file", file);
    return this._request<PdfDocument>(`${this.baseUrl}/pdfs/upload`, {
      method: "POST",
      body: formData,
    });
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
    return this._get<PdfListResponse>(
      `${this.baseUrl}/pdfs?skip=${skip}&limit=${limit}`,
    );
  }

  async getPdf(id: string): Promise<PdfDocument> {
    return this._get<PdfDocument>(`${this.baseUrl}/pdfs/${id}`);
  }

  async deletePdf(id: string): Promise<void> {
    await this._delete(`${this.baseUrl}/pdfs/${id}`);
  }

  async downloadPdf(id: string): Promise<Blob> {
    return this._blob(`${this.baseUrl}/pdfs/${id}/download`);
  }

  // ─── Merge / Split / Reorder ─────────────────────────────────────

  async mergePdfs(
    pdfIds: string[],
    outputFilename?: string,
  ): Promise<PdfDocument> {
    const body: Record<string, unknown> = { pdf_ids: pdfIds };
    if (outputFilename) body.output_filename = outputFilename;
    return this._postJson<PdfDocument>(`${this.baseUrl}/pdfs/merge`, body);
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
    return this._postJson(`${this.baseUrl}/pdfs/${id}/split`, body);
  }

  async compressPdf(
    id: string,
    quality: "low" | "medium" | "high" = "medium",
    outputFilename?: string,
    overwrite = false,
  ): Promise<PdfDocument> {
    const body: Record<string, unknown> = { quality, overwrite };
    if (outputFilename) body.output_filename = outputFilename;
    return this._postJson<PdfDocument>(
      `${this.baseUrl}/pdfs/${id}/compress`,
      body,
    );
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
    return this._postJson<PdfDocument>(
      `${this.baseUrl}/pdfs/${id}/reorder`,
      body,
    );
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
    return this._postJson<PdfDocument>(
      `${this.baseUrl}/pdfs/${id}/remove-pages`,
      body,
    );
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
    return this._postJson<PdfDocument>(
      `${this.baseUrl}/pdfs/${id}/replace-text`,
      body,
    );
  }

  async extractText(id: string, page?: number): Promise<TextExtraction> {
    const params = page ? `?page=${page}` : "";
    return this._get<TextExtraction>(`${this.baseUrl}/pdfs/${id}/text${params}`);
  }

  // ─── Metadata ────────────────────────────────────────────────────

  async getMetadata(id: string): Promise<Metadata> {
    return this._get<Metadata>(`${this.baseUrl}/pdfs/${id}/metadata`);
  }

  async updateMetadata(
    id: string,
    metadata: UpdateMetadataRequest,
  ): Promise<PdfDocument> {
    return this._putJson<PdfDocument>(
      `${this.baseUrl}/pdfs/${id}/metadata`,
      metadata,
    );
  }

  // ─── Password ────────────────────────────────────────────────────

  async unlockPdf(id: string, password: string): Promise<PdfDocument> {
    return this._postJson<PdfDocument>(`${this.baseUrl}/pdfs/${id}/unlock`, {
      password,
    });
  }

  async protectPdf(id: string, password: string): Promise<PdfDocument> {
    return this._postJson<PdfDocument>(`${this.baseUrl}/pdfs/${id}/protect`, {
      password,
    });
  }

  async signPdf(
    id: string,
    signatureImageB64: string,
    pageNumber: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Promise<PdfDocument> {
    return this._postJson<PdfDocument>(`${this.baseUrl}/pdfs/${id}/sign`, {
      signature_image_b64: signatureImageB64,
      page_number: pageNumber,
      x,
      y,
      width,
      height,
    });
  }

  // ─── Annotations ────────────────────────────────────────────────

  async addAnnotation(
    id: string,
    req: AddAnnotationRequest,
  ): Promise<PdfDocument> {
    return this._postJson<PdfDocument>(
      `${this.baseUrl}/pdfs/${id}/annotations`,
      req,
    );
  }

  // ─── OCR ────────────────────────────────────────────────────────

  async ocrPdf(id: string, language = "eng"): Promise<OcrResult> {
    return this._postJson<OcrResult>(`${this.baseUrl}/pdfs/${id}/ocr`, {
      language,
    });
  }

  // ─── Share links ────────────────────────────────────────────────

  async createShareLink(
    id: string,
    password?: string,
    expiresInDays?: number,
  ): Promise<ShareLink> {
    return this._postJson<ShareLink>(`${this.baseUrl}/pdfs/${id}/share`, {
      password: password || null,
      expires_in_days: expiresInDays || null,
    });
  }

  async listShareLinks(id: string): Promise<ShareLink[]> {
    return this._get<ShareLink[]>(`${this.baseUrl}/pdfs/${id}/shares`);
  }

  async revokeShareLink(id: string, token: string): Promise<void> {
    await this._delete(`${this.baseUrl}/pdfs/${id}/share/${token}`);
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
    return this._request<PdfDocument>(`${this.baseUrl}/pdfs/import`, {
      method: "POST",
      headers: this.getHeaders(),
      body: formData,
    });
  }

  // ─── Auth ────────────────────────────────────────────────────────

  async register(
    email: string,
    password: string,
    fullName: string,
  ): Promise<AuthResponse> {
    const data = await this._postJson<AuthResponse>(
      `${this.baseUrl}/auth/register`,
      { email, password, full_name: fullName },
    );
    if (data.csrf_token) this.setCsrfToken(data.csrf_token);
    return data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    // Usa fetch diretto (non _fetch) per evitare che il 401 auto-refresh
    // interferisca con EMAIL_NOT_FOUND / WRONG_PASSWORD
    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      // Estrai il codice errore raw (es. "EMAIL_NOT_FOUND") invece della traduzione,
      // così mapError() può matcharlo correttamente
      const body = await res.json().catch(() => null);
      const code =
        body?.detail?.code || body?.code || (await ApiClient.extractError(res));
      throw new Error(code);
    }
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
    const data = await this._postJson<AuthResponse & { user: UserResponse }>(
      `${this.baseUrl}/auth/guest`,
      undefined,
    );
    if (data.csrf_token) this.setCsrfToken(data.csrf_token);
    return data;
  }

  async convertGuest(
    email: string,
    password: string,
    fullName: string,
  ): Promise<AuthResponse> {
    const data = await this._postJson<AuthResponse>(
      `${this.baseUrl}/auth/guest/convert`,
      { email, password, full_name: fullName },
    );
    if (data.csrf_token) this.setCsrfToken(data.csrf_token);
    return data;
  }

  async forgotPassword(email: string): Promise<MessageResponse> {
    return this._postJson<MessageResponse>(
      `${this.baseUrl}/auth/forgot-password`,
      { email },
    );
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<UserResponse> {
    return this._postJson<UserResponse>(`${this.baseUrl}/auth/reset-password`, {
      token,
      new_password: newPassword,
    });
  }

  async getMe(): Promise<UserResponse> {
    return this._get<UserResponse>(`${this.baseUrl}/auth/me`);
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

  async refreshToken(): Promise<TokenPair | null> {
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

  async syncUser(user: SyncUserRequest): Promise<TokenPair | null> {
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
    return this._putJson<UserResponse>(`${this.baseUrl}/auth/me`, data);
  }

  async unlinkGoogle(password: string): Promise<UserResponse> {
    return this._postJson<UserResponse>(`${this.baseUrl}/auth/unlink/google`, {
      password,
    });
  }

  async logout(): Promise<void> {
    await this._fetch(`${this.baseUrl}/auth/logout`, { method: "POST" });
  }

  async getPreferences(): Promise<Preferences> {
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

  async updatePreferences(
    prefs: PreferencesUpdate,
  ): Promise<Preferences | null> {
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
    return this._postJson<PdfDocument>(`${this.baseUrl}/pdfs/${id}/undo`, {});
  }

  async redoPdf(id: string): Promise<PdfDocument> {
    return this._postJson<PdfDocument>(`${this.baseUrl}/pdfs/${id}/redo`, {});
  }

  // ─── Bug reports ─────────────────────────────────────────────────

  async createBugReport(
    title: string,
    description: string,
    pageUrl?: string,
  ): Promise<BugReport> {
    const body: Record<string, string> = {
      title,
      description,
      platform: "desktop",
    };
    if (pageUrl) body.page_url = pageUrl;
    return this._postJson<BugReport>(`${this.baseUrl}/bugs`, body);
  }

  async listBugReports(
    skip = 0,
    limit = 100,
    status?: string,
  ): Promise<ListResult<BugReport>> {
    const params = new URLSearchParams({
      skip: String(skip),
      limit: String(limit),
    });
    if (status) params.set("status", status);
    return this._get<ListResult<BugReport>>(`${this.baseUrl}/admin/bugs?${params}`);
  }

  // ─── Admin ───────────────────────────────────────────────────────

  async adminListUsers(): Promise<AdminUser[]> {
    return this._get<AdminUser[]>(`${this.baseUrl}/admin/users`);
  }

  async adminUpdateUser(
    userId: string,
    data: AdminUserUpdate,
  ): Promise<AdminUser> {
    return this._putJson<AdminUser>(`${this.baseUrl}/admin/users/${userId}`, data);
  }

  async adminSendResetEmail(userId: string): Promise<MessageResponse> {
    const res = await this._fetch(
      `${this.baseUrl}/admin/users/${userId}/send-reset`,
      { method: "POST", headers: this.getHeaders() },
    );
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  // ─── Web-compatible methods ──────────────────────────────────────
  // These mirror the web's lib/api.ts surface so the web can use the
  // shared ApiClient without breaking its existing call sites.

  async listMyBugReports(): Promise<BugReport[]> {
    return this._get<BugReport[]>(`${this.baseUrl}/bugs/my`);
  }

  async searchBugReports(query: string): Promise<BugReport[]> {
    return this._get<BugReport[]>(
      `${this.baseUrl}/bugs/search?q=${encodeURIComponent(query)}`,
    );
  }

  async voteBugReport(bugId: string): Promise<BugReport> {
    return this._request<BugReport>(`${this.baseUrl}/bugs/${bugId}/vote`, {
      method: "POST",
      headers: this.getHeaders(),
    });
  }

  async getLicenseFeatures(): Promise<LicenseFeature[]> {
    return this._get<LicenseFeature[]>(`${this.baseUrl}/licenses/features`);
  }

  async listUsers(
    skip = 0,
    limit = 100,
  ): Promise<ListResult<AdminUser>> {
    return this._get<ListResult<AdminUser>>(
      `${this.baseUrl}/admin/users?skip=${skip}&limit=${limit}`,
    );
  }

  async updateUserLicense(
    userId: string,
    licenseTier: string,
  ): Promise<AdminUser> {
    return this._putJson<AdminUser>(
      `${this.baseUrl}/admin/users/${userId}/license`,
      { license_tier: licenseTier },
    );
  }

  async updateUserAdmin(userId: string, isAdmin: boolean): Promise<AdminUser> {
    return this._putJson<AdminUser>(
      `${this.baseUrl}/admin/users/${userId}/admin`,
      { is_admin: isAdmin },
    );
  }

  async adminSendReset(userId: string): Promise<MessageResponse> {
    const res = await this._fetch(
      `${this.baseUrl}/admin/users/${userId}/send-reset`,
      { method: "POST", headers: this.getHeaders() },
    );
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async updateBugReportStatus(
    bugId: string,
    status: string,
  ): Promise<BugReport> {
    return this._putJson<BugReport>(
      `${this.baseUrl}/admin/bugs/${bugId}/status`,
      { status },
    );
  }
}

/** Singleton instance for PDF operations (local sidecar) */
export const api = new ApiClient();

/** Cloud API client for auth (register/login via Render/Neon) */
export const cloudApi = new ApiClient(getCloudApiBaseUrl());

// ─── Keep-warm: evita cold start del backend su Render ──────────────

let _keepWarmTimer: ReturnType<typeof setInterval> | null = null;
const KEEP_WARM_INTERVAL = 5 * 60 * 1000; // 5 minuti

/**
 * Avvia il ping periodico al backend cloud per evitare il cold start.
 * Il ping va a /health che è leggero e non richiede autenticazione.
 */
export function startKeepWarm(): void {
  if (_keepWarmTimer) return; // già avviato
  const url = `${getCloudApiBaseUrl()}/health`;
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
