const API_BASE = "http://localhost:8000";

export interface PdfDocument {
  id: string;
  original_filename: string;
  file_size: number;
  page_count: number;
  title?: string | null;
  author?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PdfListResponse {
  items: PdfDocument[];
  total: number;
}

export interface Metadata {
  title?: string | null;
  author?: string | null;
  subject?: string | null;
  keywords?: string | null;
}

export interface BugReport {
  id: string;
  user_id: string;
  title: string;
  description: string;
  page_url?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    return headers;
  }

  // PDF endpoints
  async uploadPdf(file: File): Promise<PdfDocument> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${this.baseUrl}/pdfs/upload`, {
      method: "POST",
      headers: this.getHeaders(),
      body: formData,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async listPdfs(skip = 0, limit = 100): Promise<PdfListResponse> {
    const res = await fetch(`${this.baseUrl}/pdfs?skip=${skip}&limit=${limit}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async getPdf(id: string): Promise<PdfDocument> {
    const res = await fetch(`${this.baseUrl}/pdfs/${id}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async deletePdf(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/pdfs/${id}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
  }

  async downloadPdf(id: string): Promise<Blob> {
    const res = await fetch(`${this.baseUrl}/pdfs/${id}/download`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  }

  // Merge / Split
  async mergePdfs(pdfIds: string[]): Promise<PdfDocument> {
    const res = await fetch(`${this.baseUrl}/pdfs/merge`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ pdf_ids: pdfIds }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async splitPdf(id: string, mode: "every" | "range", ranges?: string[]) {
    const body: Record<string, unknown> = { mode };
    if (ranges) body.ranges = ranges;
    const res = await fetch(`${this.baseUrl}/pdfs/${id}/split`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  // Reorder / Remove pages
  async reorderPages(id: string, pageOrder: number[]): Promise<PdfDocument> {
    const res = await fetch(`${this.baseUrl}/pdfs/${id}/reorder`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ page_order: pageOrder }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async removePages(id: string, pageNumbers: number[]): Promise<PdfDocument> {
    const res = await fetch(`${this.baseUrl}/pdfs/${id}/remove-pages`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ page_numbers: pageNumbers }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  // Text
  async replaceText(
    id: string,
    search: string,
    replace: string,
    occurrence?: number
  ): Promise<PdfDocument> {
    const body: Record<string, unknown> = { search, replace };
    if (occurrence !== undefined) body.occurrence = occurrence;
    const res = await fetch(`${this.baseUrl}/pdfs/${id}/replace-text`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async extractText(id: string, page?: number): Promise<{ text: string; pages: number }> {
    const params = page ? `?page=${page}` : "";
    const res = await fetch(`${this.baseUrl}/pdfs/${id}/text${params}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  // Metadata
  async getMetadata(id: string): Promise<Metadata> {
    const res = await fetch(`${this.baseUrl}/pdfs/${id}/metadata`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async updateMetadata(id: string, metadata: Partial<Metadata>): Promise<PdfDocument> {
    const res = await fetch(`${this.baseUrl}/pdfs/${id}/metadata`, {
      method: "PUT",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(metadata),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  // Export / Import
  async exportPdf(id: string, format: string): Promise<Blob> {
    const res = await fetch(`${this.baseUrl}/pdfs/${id}/export?fmt=${format}`, {
      method: "POST",
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  }

  async importFile(file: File): Promise<PdfDocument> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${this.baseUrl}/pdfs/import`, {
      method: "POST",
      headers: this.getHeaders(),
      body: formData,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  // Auth
  async register(
    email: string,
    password: string,
    fullName: string
  ): Promise<{ id: string; email: string; full_name: string }> {
    const res = await fetch(`${this.baseUrl}/auth/register`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async login(email: string, password: string): Promise<{ access_token: string; token_type: string }> {
    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async googleLogin(idToken: string): Promise<{ access_token: string; token_type: string }> {
    const res = await fetch(`${this.baseUrl}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: idToken }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async getMe(): Promise<{ id: string; email: string; full_name: string; is_active: boolean; is_admin: boolean; license_tier: string }> {
    const res = await fetch(`${this.baseUrl}/auth/me`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  // Bugs
  async createBugReport(
    title: string,
    description: string,
    pageUrl?: string
  ): Promise<BugReport> {
    const body: Record<string, unknown> = { title, description };
    if (pageUrl) body.page_url = pageUrl;
    const res = await fetch(`${this.baseUrl}/bugs`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  // License
  async getLicenseFeatures(): Promise<
    { id: string; tier: string; feature_key: string; enabled: boolean }[]
  > {
    const res = await fetch(`${this.baseUrl}/licenses/features`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
}

export const api = new ApiClient();
