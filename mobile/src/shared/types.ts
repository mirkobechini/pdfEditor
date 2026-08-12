/** Shared types for PdfEditor Mobile — same as shared/src/types.ts */

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  is_guest: boolean;
  license_tier: string;
  license_tier_source: string;
  google_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PdfDocument {
  id: string;
  original_filename: string;
  file_size: number;
  page_count: number;
  title?: string | null;
  author?: string | null;
  is_password_protected?: boolean;
  pdf_creation_date?: string | null;
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
  report_count?: number;
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

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  is_guest: boolean;
  license_tier: string;
  license_tier_source: string;
  google_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  csrf_token?: string;
  user?: UserResponse;
}

export interface LocalPdf {
  id: string;
  user_id?: string; // empty for guest, user id for logged-in users
  original_filename: string;
  file_size: number;
  page_count: number;
  title?: string | null;
  author?: string | null;
  uri: string; // local file URI in expo-file-system
  created_at: string;
  updated_at: string;
  cloud_synced?: number; // 0 = not synced, 1 = synced
  cloud_synced_at?: string | null; // ISO timestamp of last successful sync
  cloud_synced_exclude?: number; // 1 = excluded from sync (keep only local)
}
