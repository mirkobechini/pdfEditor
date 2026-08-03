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

  static async extractError(res: Response): Promise<string> {
    if (res.status === 429) {
      return JSON.stringify({
        code: "RATE_LIMIT",
        detail: "Too many requests",
      });
    }
    try {
      const body = await res.json();
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
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
    if (this._csrfToken) headers["X-CSRF-Token"] = this._csrfToken;
    return headers;
  }

  private async _fetch(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
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

  async guestLogin(): Promise<AuthResponse & { user: UserResponse }> {
    const res = await this._fetch(`${this.baseUrl}/auth/guest`, {
      method: "POST",
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    const data = await res.json();
    if (data.csrf_token) this.setCsrfToken(data.csrf_token);
    return data;
  }

  async getMe(): Promise<UserResponse> {
    const res = await this._fetch(`${this.baseUrl}/auth/me`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async logout(): Promise<void> {
    await this._fetch(`${this.baseUrl}/auth/logout`, { method: "POST" });
  }

  // ─── PDF endpoints ───────────────────────────────────────────────

  async uploadPdf(
    fileUri: string,
    fileName: string,
    mimeType: string,
  ): Promise<PdfDocument> {
    const formData = new FormData();
    formData.append("file", {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);
    const res = await this._fetch(`${this.baseUrl}/pdfs/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
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
  ) {
    const body: Record<string, unknown> = { mode };
    if (ranges) body.ranges = ranges;
    if (outputFilename) body.output_filename = outputFilename;
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
  ): Promise<PdfDocument> {
    const body: Record<string, unknown> = { page_order: pageOrder };
    if (outputFilename) body.output_filename = outputFilename;
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
  ): Promise<PdfDocument> {
    const body: Record<string, unknown> = { page_numbers: pageNumbers };
    if (outputFilename) body.output_filename = outputFilename;
    const res = await this._fetch(`${this.baseUrl}/pdfs/${id}/remove-pages`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
    metadata: Partial<Metadata>,
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
}

// Singleton instance
export const api = new ApiClient();
