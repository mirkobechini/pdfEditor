// Shared package barrel export
export { api, ApiClient } from "./api";
export type {
  PdfDocument,
  PdfListResponse,
  Metadata,
  BugReport,
  AdminUser,
  UserResponse,
  AuthResponse,
} from "./api";
export { AuthProvider, useAuth } from "./auth";
export type { User } from "./types";
export { mapError, extractErrorDetail, ErrorCode } from "./error-map";
export type { ErrorCodeType } from "./error-map";
export { isTauri, getApiBaseUrl, tauriInvoke } from "./tauri";