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
