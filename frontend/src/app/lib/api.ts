const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface PdfDocument {
  id: string;
  original_filename: string;
  file_size: number;
  page_count: number;
  title?: string | null;
  author?: string | null;
  is_password_protected?: boolean;
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
  platform?: string | null;
  app_version?: string | null;
  os_info?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  license_tier: string;
  created_at: string;
  updated_at: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  static async extractError(res: Response): Promise<string> {
    try {
      const body = await res.json();
      if (typeof body.detail === "string") return body.detail;
      if (Array.isArray(body.detail))
        return body.detail[0]?.msg || res.statusText;
      return JSON.stringify(body);
    } catch {
      return res.statusText;
    }
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
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async listPdfs(skip = 0, limit = 100): Promise<PdfListResponse> {
    const res = await fetch(
      `${this.baseUrl}/pdfs?skip=${skip}&limit=${limit}`,
      {
        headers: this.getHeaders(),
      },
    );
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async getPdf(id: string): Promise<PdfDocument> {
    const res = await fetch(`${this.baseUrl}/pdfs/${id}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async deletePdf(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/pdfs/${id}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
  }

  async downloadPdf(id: string): Promise<Blob> {
    const res = await fetch(`${this.baseUrl}/pdfs/${id}/download`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.blob();
  }

  // Merge / Split
  async mergePdfs(pdfIds: string[]): Promise<PdfDocument> {
    const res = await fetch(`${this.baseUrl}/pdfs/merge`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ pdf_ids: pdfIds }),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
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
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  // Reorder / Remove pages
  async reorderPages(id: string, pageOrder: number[]): Promise<PdfDocument> {
    const res = await fetch(`${this.baseUrl}/pdfs/${id}/reorder`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ page_order: pageOrder }),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async removePages(id: string, pageNumbers: number[]): Promise<PdfDocument> {
    const res = await fetch(`${this.baseUrl}/pdfs/${id}/remove-pages`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ page_numbers: pageNumbers }),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  // Text
  async replaceText(
    id: string,
    search: string,
    replace: string,
    occurrence?: number,
  ): Promise<PdfDocument> {
    const body: Record<string, unknown> = { search, replace };
    if (occurrence !== undefined) body.occurrence = occurrence;
    const res = await fetch(`${this.baseUrl}/pdfs/${id}/replace-text`, {
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
    const res = await fetch(`${this.baseUrl}/pdfs/${id}/text${params}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  // Metadata
  async getMetadata(id: string): Promise<Metadata> {
    const res = await fetch(`${this.baseUrl}/pdfs/${id}/metadata`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  // Password-protected PDFs
  async unlockPdf(id: string, password: string): Promise<PdfDocument> {
    const res = await fetch(`${this.baseUrl}/pdfs/${id}/unlock`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async protectPdf(id: string, password: string): Promise<PdfDocument> {
    const res = await fetch(`${this.baseUrl}/pdfs/${id}/protect`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async updateMetadata(
    id: string,
    metadata: Partial<Metadata>,
  ): Promise<PdfDocument> {
    const res = await fetch(`${this.baseUrl}/pdfs/${id}/metadata`, {
      method: "PUT",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(metadata),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  // Export / Import
  async exportPdf(id: string, format: string): Promise<Blob> {
    const res = await fetch(`${this.baseUrl}/pdfs/${id}/export?fmt=${format}`, {
      method: "POST",
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
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
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  // Auth
  async register(
    email: string,
    password: string,
    fullName: string,
  ): Promise<{ id: string; email: string; full_name: string }> {
    const res = await fetch(`${this.baseUrl}/auth/register`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ access_token: string; token_type: string }> {
    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async googleLogin(
    idToken: string,
  ): Promise<{ access_token: string; token_type: string }> {
    const res = await fetch(`${this.baseUrl}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: idToken }),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const res = await fetch(`${this.baseUrl}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async resetPassword(token: string, newPassword: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, new_password: newPassword }),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async getMe(): Promise<{
    id: string;
    email: string;
    full_name: string;
    is_active: boolean;
    is_admin: boolean;
    license_tier: string;
    license_tier_source: string;
    created_at: string;
    updated_at: string;
  }> {
    const res = await fetch(`${this.baseUrl}/auth/me`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async updateProfile(data: { full_name: string }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/auth/me`, {
      method: "PUT",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  // Undo / Redo
  async undoPdf(id: string): Promise<PdfDocument> {
    const res = await fetch(`${this.baseUrl}/pdfs/${id}/undo`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: "{}",
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async redoPdf(id: string): Promise<PdfDocument> {
    const res = await fetch(`${this.baseUrl}/pdfs/${id}/redo`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: "{}",
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  // Bug reports
  async createBugReport(
    title: string,
    description: string,
    pageUrl?: string,
  ): Promise<BugReport> {
    const body: Record<string, unknown> = { title, description };
    if (pageUrl) body.page_url = pageUrl;
    const res = await fetch(`${this.baseUrl}/bugs`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  // License
  async getLicenseFeatures(): Promise<
    { id: string; tier: string; feature_key: string; enabled: boolean }[]
  > {
    const res = await fetch(`${this.baseUrl}/licenses/features`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  // Admin
  async listUsers(
    skip = 0,
    limit = 100,
  ): Promise<{ items: AdminUser[]; total: number }> {
    const res = await fetch(
      `${this.baseUrl}/admin/users?skip=${skip}&limit=${limit}`,
      {
        headers: this.getHeaders(),
      },
    );
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async updateUserLicense(
    userId: string,
    licenseTier: string,
  ): Promise<AdminUser> {
    const res = await fetch(`${this.baseUrl}/admin/users/${userId}/license`, {
      method: "PUT",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ license_tier: licenseTier }),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async updateUserAdmin(userId: string, isAdmin: boolean): Promise<AdminUser> {
    const res = await fetch(`${this.baseUrl}/admin/users/${userId}/admin`, {
      method: "PUT",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ is_admin: isAdmin }),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async listBugReports(
    skip = 0,
    limit = 100,
    status?: string,
  ): Promise<{ items: BugReport[]; total: number }> {
    const params = new URLSearchParams({
      skip: String(skip),
      limit: String(limit),
    });
    if (status) params.set("status", status);
    const res = await fetch(`${this.baseUrl}/admin/bugs?${params}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }

  async updateBugReportStatus(
    bugId: string,
    status: string,
  ): Promise<BugReport> {
    const res = await fetch(`${this.baseUrl}/admin/bugs/${bugId}/status`, {
      method: "PUT",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error(await ApiClient.extractError(res));
    return res.json();
  }
}

export const api = new ApiClient();
