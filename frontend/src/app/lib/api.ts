/**
 * Re-export from shared (single source of truth).
 * The shared api.ts is copied to src/shared/ via the prebuild script.
 */
export {
  ApiClient,
  api,
  cloudApi,
  startKeepWarm,
  stopKeepWarm,
} from "../../shared/api";
export type {
  PdfDocument,
  PdfListResponse,
  Metadata,
  BugReport,
  AdminUser,
  UserResponse,
  AuthResponse,
} from "../../shared/api";
