/**
 * API client for PdfEditor Mobile.
 *
 * Points to the cloud backend (Render/Neon) for auth and PDF operations.
 * No Tauri / sidecar dependencies.
 */
import type {
  PdfDocument,
  PdfListResponse,
  Metadata,
  AuthResponse,
  UserResponse,
  LocalPdf,
} from "./types";

export type {
  PdfDocument,
  PdfListResponse,
  Metadata,
  AuthResponse,
  UserResponse,
  LocalPdf,
};

// Cloud backend URL
const CLOUD_API_URL = "https://pdfeditor-api.mirkobechini.com";

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
    this.baseUrl = baseUrl ?? CLOUD_API_URL;
  }

  getToken(): string | null {
    return this.token;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  setCsrfToken(token: string | null) {
    this._csrfToken = token;
  }

  static async extractError(err: unknown): Promise<string> {
    if (err instanceof Response) {
      return ApiClient.extractErrorResponse(err);
    }
    if (err instanceof DOMException && err.name === "AbortError") {
      return "Connection timeout. The server is waking up, please try again in a moment.";
    }
    if (err instanceof TypeError && err.message === "Network request failed") {
      return "Connection error. Check your internet connection.";
    }
    if (err instanceof Error) return err.message;
    // Fallback for mock Response objects in tests
    if (err && typeof err === "object" && "status" in err && "json" in err) {
      return ApiClient.extractErrorResponse(err as Response);
    }
    return "An unexpected error occurred";
  }

  static async extractErrorResponse(res: Response): Promise<string> {
    if (res.status === 429) {
      return "Too many requests. Please try again later.";
    }
    try {
      const body = await res.json();
      if (body && typeof body === "object") {
        if (body.detail && typeof body.detail === "string") return body.detail;
        if (body.code && body.detail) return body.detail;
        if (Array.isArray(body.detail))
          return body.detail[0]?.msg || res.statusText;
      }
      return JSON.stringify(body);
    } catch {
      return res.statusText;
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
    if (this._csrfToken) headers["X-CSRF-Token"] = this._csrfToken;
    return headers;
  }

  private async _fetch(
    url: string,
    options: RequestInit = {},
    timeoutMs = 30000,
  ): Promise<Response> {
    const headers = {
      ...this.getHeaders(),
      ...((options.headers as Record<string, string>) || {}),
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...options,
        // No credentials: include — RN doesn't handle cookies like a browser.
        // We rely on Authorization header + X-CSRF-Token header instead.
        headers,
        signal: controller.signal,
      });

      // Auto-refresh on 401/INVALID_CREDENTIALS
      if (res.status === 401 && !this._isRefreshing) {
        const body = await res
          .clone()
          .json()
          .catch(() => null);
        // Backend returns {detail: {code, detail}} — handle both string and object
        const detail = body?.detail || "";
        const code = typeof detail === "string" ? detail : detail?.code || "";
        const detailMsg =
          typeof detail === "string" ? detail : detail?.detail || "";
        if (code === "INVALID_CREDENTIALS" || detailMsg.includes("expired")) {
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
              headers: retryHeaders,
              signal: controller.signal,
            });
          }
        }
      }

      return res;
    } finally {
      clearTimeout(timeout);
    }
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
    if (!res.ok) throw new Error(await ApiClient.extractErrorResponse(res));
    const data = await res.json();
    if (data.csrf_token) this.setCsrfToken(data.csrf_token);
    return data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    // Usa fetch diretto (non _fetch) per evitare che il 401 auto-refresh
    // interferisca con EMAIL_NOT_FOUND / WRONG_PASSWORD
    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const code =
        body?.detail?.code ||
        body?.code ||
        (await ApiClient.extractErrorResponse(res));
      throw new Error(code);
    }
    const data = await res.json();
    if (data.csrf_token) this.setCsrfToken(data.csrf_token);
    return data;
  }

  async guestLogin(): Promise<AuthResponse & { user: UserResponse }> {
    const res = await this._fetch(`${this.baseUrl}/auth/guest`, {
      method: "POST",
    });
    if (!res.ok) throw new Error(await ApiClient.extractErrorResponse(res));
    const data = await res.json();
    if (data.csrf_token) this.setCsrfToken(data.csrf_token);
    return data;
  }

  async getMe(): Promise<UserResponse> {
    const res = await this._fetch(`${this.baseUrl}/auth/me`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await ApiClient.extractErrorResponse(res));
    return res.json();
  }

  async logout(): Promise<void> {
    await this._fetch(`${this.baseUrl}/auth/logout`, { method: "POST" });
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const res = await this._fetch(`${this.baseUrl}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error(await ApiClient.extractErrorResponse(res));
    return res.json();
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<UserResponse> {
    const res = await this._fetch(`${this.baseUrl}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, new_password: newPassword }),
    });
    if (!res.ok) throw new Error(await ApiClient.extractErrorResponse(res));
    return res.json();
  }

  // ─── PDF endpoints ───────────────────────────────────────────────

  async uploadPdf(
    fileUri: string,
    fileName: string,
    mimeType: string,
  ): Promise<PdfDocument> {
    const formData = new FormData();
    // Expo SDK 57 / RN 0.86 requires a real Blob, not the legacy {uri,name,type} hack
    try {
      const res = await fetch(fileUri);
      const blob = await res.blob();
      formData.append("file", blob, fileName);
      const uploadRes = await this._fetch(
        `${this.baseUrl}/pdfs/upload?upload_source=mobile`,
        {
          method: "POST",
          body: formData,
        },
      );
      if (!uploadRes.ok)
        throw new Error(await ApiClient.extractErrorResponse(uploadRes));
      return uploadRes.json();
    } catch (e) {
      console.error("[api] uploadPdf failed:", e);
      throw e;
    }
  }

  async listPdfs(skip = 0, limit = 100): Promise<PdfListResponse> {
    const res = await this._fetch(
      `${this.baseUrl}/pdfs?skip=${skip}&limit=${limit}`,
      { headers: this.getHeaders() },
    );
    if (!res.ok) throw new Error(await ApiClient.extractErrorResponse(res));
    return res.json();
  }

  async getPdf(id: string): Promise<PdfDocument> {
    const res = await this._fetch(`${this.baseUrl}/pdfs/${id}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await ApiClient.extractErrorResponse(res));
    return res.json();
  }

  async deletePdf(id: string): Promise<void> {
    const res = await this._fetch(`${this.baseUrl}/pdfs/${id}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await ApiClient.extractErrorResponse(res));
  }

  async downloadPdf(id: string): Promise<Blob> {
    const res = await this._fetch(`${this.baseUrl}/pdfs/${id}/download`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await ApiClient.extractErrorResponse(res));
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
    if (!res.ok) throw new Error(await ApiClient.extractErrorResponse(res));
    return res.json();
  }

  async splitPdf(
    id: string,
    mode: "every" | "range",
    ranges?: string[],
    outputFilename?: string,
  ) {
    const body: Record<string, unknown> = { mode };
    if (ranges) body.ranges = ranges;
    if (outputFilename) body.output_filename = outputFilename;
    const res = await this._fetch(`${this.baseUrl}/pdfs/${id}/split`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await ApiClient.extractErrorResponse(res));
    return res.json();
  }

  async reorderPages(
    id: string,
    pageOrder: number[],
    outputFilename?: string,
  ): Promise<PdfDocument> {
    const body: Record<string, unknown> = { page_order: pageOrder };
    if (outputFilename) body.output_filename = outputFilename;
    const res = await this._fetch(`${this.baseUrl}/pdfs/${id}/reorder`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await ApiClient.extractErrorResponse(res));
    return res.json();
  }

  async removePages(
    id: string,
    pageNumbers: number[],
    outputFilename?: string,
  ): Promise<PdfDocument> {
    const body: Record<string, unknown> = { page_numbers: pageNumbers };
    if (outputFilename) body.output_filename = outputFilename;
    const res = await this._fetch(`${this.baseUrl}/pdfs/${id}/remove-pages`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await ApiClient.extractErrorResponse(res));
    return res.json();
  }

  // ─── Metadata ────────────────────────────────────────────────────

  async getMetadata(id: string): Promise<Metadata> {
    const res = await this._fetch(`${this.baseUrl}/pdfs/${id}/metadata`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await ApiClient.extractErrorResponse(res));
    return res.json();
  }

  async updateMetadata(
    id: string,
    metadata: Partial<Metadata>,
  ): Promise<PdfDocument> {
    const res = await this._fetch(`${this.baseUrl}/pdfs/${id}/metadata`, {
      method: "PUT",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(metadata),
    });
    if (!res.ok) throw new Error(await ApiClient.extractErrorResponse(res));
    return res.json();
  }

  // ─── Password ────────────────────────────────────────────────────

  async unlockPdf(id: string, password: string): Promise<PdfDocument> {
    const res = await this._fetch(`${this.baseUrl}/pdfs/${id}/unlock`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) throw new Error(await ApiClient.extractErrorResponse(res));
    return res.json();
  }

  async protectPdf(id: string, password: string): Promise<PdfDocument> {
    const res = await this._fetch(`${this.baseUrl}/pdfs/${id}/protect`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) throw new Error(await ApiClient.extractErrorResponse(res));
    return res.json();
  }

  // Text
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
    if (!res.ok) throw new Error(await ApiClient.extractErrorResponse(res));
    return res.json();
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
}

// Singleton instance
export const api = new ApiClient();
