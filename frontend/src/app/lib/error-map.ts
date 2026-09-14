/**
 * Re-export from shared (single source of truth).
 * The shared error-map.ts is copied to src/shared/ via the prebuild script.
 */
export {
  ErrorCode,
  mapError,
  extractErrorDetail,
} from "../../shared/error-map";
export type { ErrorCodeType } from "../../shared/error-map";
