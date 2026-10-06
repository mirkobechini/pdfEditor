/** Shared types for PdfEditor — used by both web and desktop frontends */

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
  upload_source?: string;
  created_at: string;
  updated_at: string;
}

export interface PdfListResponse {
  items: PdfDocument[];
  total: number;
}

export interface OcrResult {
  pdf: PdfDocument;
  character_count: number;
  already_searchable: boolean;
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

export interface ShareLink {
  id: string;
  pdf_id: string;
  token: string;
  url: string;
  has_password: boolean;
  expires_at: string | null;
  created_at: string;
}

/** Result of extractText(): number of pages and the extracted text. */
export interface TextExtraction {
  text: string;
  pages: number;
}

/** Payload for updateMetadata (supports renaming/overwriting too). */
export interface UpdateMetadataRequest extends Partial<Metadata> {
  new_filename?: string;
  overwrite?: boolean;
}

/** Payload for addAnnotation. */
export interface AddAnnotationRequest {
  page: number;
  type: string;
  rect: number[];
  color?: string;
  content?: string | null;
  points?: number[][];
  opacity?: number;
}

/** Pair of tokens returned by refresh/sync endpoints. */
export interface TokenPair {
  access_token: string;
  csrf_token: string;
}

/** Payload for syncUser (local desktop sidecar -> cloud). */
export interface SyncUserRequest {
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
}

/** User preferences (getCurrent/update). */
export interface Preferences {
  theme: string;
  language: string;
  default_zoom: number;
  antialiasing: boolean;
  density: string;
}

/** Partial preferences accepted by updatePreferences. */
export interface PreferencesUpdate extends Partial<Preferences> {}

/** A license feature entitlement. */
export interface LicenseFeature {
  id: string;
  tier: string;
  feature_key: string;
  enabled: boolean;
}

/** Partial admin fields editable via adminUpdateUser. */
export interface AdminUserUpdate {
  is_active?: boolean;
  is_admin?: boolean;
  license_tier?: string;
}

/** Generic list response: { items, total }. */
export interface ListResult<T> {
  items: T[];
  total: number;
}

/** A simple { message: string } response. */
export interface MessageResponse {
  message: string;
}
