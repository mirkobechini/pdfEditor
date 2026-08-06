// Shared module barrel export for mobile
export { api, ApiClient } from "./api";
export type {
  PdfDocument,
  PdfListResponse,
  Metadata,
  BugReport,
  AdminUser,
  UserResponse,
  AuthResponse,
  LocalPdf,
} from "./types";
export { AuthProvider, useAuth } from "./auth";
export type { User } from "./types";
export { mapError, extractErrorDetail, ErrorCode } from "./error-map";
export type { ErrorCodeType } from "./error-map";
