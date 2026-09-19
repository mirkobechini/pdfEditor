/**
 * Client API per il microservizio pdf-documents-api (Browse documents).
 *
 * Il microservizio è un servizio separato (FastAPI + SQLite) che cataloga
 * documenti PDF reali da Internet Archive. Gira su porta 8001 (locale) o su
 * un URL pubblico (cloud).
 *
 * URL base configurabile via NEXT_PUBLIC_DOCUMENTS_API_URL.
 */

export interface BrowseDocument {
  id: number;
  identifier: string;
  title: string;
  authors: string[];
  subjects: string[];
  languages: string[];
  copyright: boolean;
  media_type: string;
  download_count: number;
  pdf_url: string | null;
  text_url: string | null;
  cover_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface BrowseDocumentList {
  total: number;
  page: number;
  page_size: number;
  items: BrowseDocument[];
}

export interface BrowseStats {
  total_documents: number;
  by_language: Record<string, number>;
  by_subject: Record<string, number>;
  last_ingest: string | null;
}

export function getDocumentsApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_DOCUMENTS_API_URL || "http://localhost:8001";
}

export class DocumentsApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? getDocumentsApiBaseUrl();
  }

  private async request<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`);
    if (!res.ok) {
      throw new Error(`Documents API error ${res.status}: ${res.statusText}`);
    }
    return res.json() as Promise<T>;
  }

  /** Lista documenti paginata. */
  listDocuments(page = 1, pageSize = 12): Promise<BrowseDocumentList> {
    return this.request<BrowseDocumentList>(
      `/api/v1/documents?page=${page}&page_size=${pageSize}`,
    );
  }

  /** Ricerca documenti. */
  searchDocuments(
    q: string,
    page = 1,
    pageSize = 12,
  ): Promise<BrowseDocumentList> {
    const query = encodeURIComponent(q);
    return this.request<BrowseDocumentList>(
      `/api/v1/search?q=${query}&page=${page}&page_size=${pageSize}`,
    );
  }

  /** Dettaglio documento. */
  getDocument(id: number): Promise<BrowseDocument> {
    return this.request<BrowseDocument>(`/api/v1/documents/${id}`);
  }

  /** Statistiche catalogo. */
  getStats(): Promise<BrowseStats> {
    return this.request<BrowseStats>("/api/v1/stats");
  }
}

export const documentsApi = new DocumentsApiClient();
