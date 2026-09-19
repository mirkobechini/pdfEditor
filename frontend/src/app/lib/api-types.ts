/**
 * Re-export from shared (single source of truth).
 * The shared types.ts is copied to src/shared/ via the prebuild script.
 */
export type {
  User,
  PdfDocument,
  PdfListResponse,
  Metadata,
  BugReport,
  AdminUser,
  UserResponse,
  AuthResponse,
} from "../../shared/types";

/** A shareable link for a PDF document. */
export interface ShareLink {
  id: string;
  pdf_id: string;
  token: string;
  url: string;
  has_password: boolean;
  expires_at: string | null;
  created_at: string;
}
