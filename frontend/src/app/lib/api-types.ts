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
  license_tier: string;
  license_tier_source: string;
  google_id: string | null;
  created_at: string;
  updated_at: string;
}
