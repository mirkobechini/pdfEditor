/**
 * Centralized error code mapping.
 *
 * Maps backend error codes (from `app.core.errors.ErrorCode`) and
 * HTTP status codes to stable i18n keys. Every catch block in the UI
 * should use `mapError(err)` instead of displaying `err.message` raw.
 */

// Backend error codes (must match app/core/errors.py)
export const ErrorCode = {
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  RATE_LIMIT: "RATE_LIMIT",
  NOT_AUTHENTICATED: "NOT_AUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  PDF_NOT_FOUND: "PDF_NOT_FOUND",
  PDF_FILE_NOT_FOUND: "PDF_FILE_NOT_FOUND",
  UPLOAD_TOO_LARGE: "UPLOAD_TOO_LARGE",
  INVALID_PDF: "INVALID_PDF",
  INVALID_FILE_TYPE: "INVALID_FILE_TYPE",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  EMAIL_ALREADY_REGISTERED: "EMAIL_ALREADY_REGISTERED",
  PASSWORD_TOO_WEAK: "PASSWORD_TOO_WEAK",
  RESET_TOKEN_INVALID: "RESET_TOKEN_INVALID",
  RESET_TOKEN_EXPIRED: "RESET_TOKEN_EXPIRED",
  GOOGLE_AUTH_FAILED: "GOOGLE_AUTH_FAILED",
  CONVERSION_FAILED: "CONVERSION_FAILED",
  SEARCH_TEXT_EMPTY: "SEARCH_TEXT_EMPTY",
  MERGE_TOO_FEW: "MERGE_TOO_FEW",
  SPLIT_INVALID_RANGE: "SPLIT_INVALID_RANGE",
  CANNOT_DEMOTE_SUPER_ADMIN: "CANNOT_DEMOTE_SUPER_ADMIN",
  STRIPE_LICENSE_LOCKED: "STRIPE_LICENSE_LOCKED",
  BUG_NOT_FOUND: "BUG_NOT_FOUND",
  BUG_VOTE_NOT_FOUND: "BUG_VOTE_NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Map an error (from catch) to an i18n key.
 *
 * The error may be:
 * 1. An Error with a `message` that whose JSON is `{code, detail}`
 * 2. An Error with a plain string message (legacy / fallback)
 * 3. A string
 */
export function mapError(err: unknown): string {
  const message = extractMessage(err);

  // Try to parse the message as a JSON error response {code, detail}
  if (message.startsWith("{")) {
    try {
      const parsed = JSON.parse(message);
      if (parsed.code) {
        return codeToI18nKey(parsed.code);
      }
    } catch {
      // Not JSON, fall through
    }
  }

  // Check for known plain-text messages (legacy / fallback)
  if (message === "RATE_LIMIT") return "common.rateLimitExceeded";
  if (message.includes("Email already registered"))
    return "auth.emailAlreadyRegistered";
  if (message.includes("Invalid email or password"))
    return "auth.invalidCredentials";
  if (message.includes("Not authenticated")) return "auth.notAuthenticated";
  if (message.includes("Admin access required")) return "common.forbidden";
  if (message.includes("PDF not found")) return "pdf.notFound";
  if (message.includes("file not found on disk")) return "pdf.fileNotFound";
  if (message.includes("too large")) return "pdf.uploadTooLarge";
  if (message.includes("Invalid PDF")) return "pdf.invalidPdf";
  if (message.includes("Only PDF files are allowed"))
    return "pdf.onlyPdfAllowed";
  if (message.includes("Unsupported file type"))
    return "pdf.unsupportedFileType";
  if (message.includes("Invalid or expired reset token"))
    return "auth.resetInvalidToken";
  if (message.includes("Reset token has expired"))
    return "auth.resetTokenExpired";
  if (message.includes("Password must be at least"))
    return "auth.passwordTooShort";
  if (message.includes("must contain at least one uppercase"))
    return "auth.passwordMissingUppercase";
  if (message.includes("must contain at least one lowercase"))
    return "auth.passwordMissingLowercase";
  if (message.includes("must contain at least one number"))
    return "auth.passwordMissingNumber";
  if (message.includes("Network error") || message.includes("Failed to fetch"))
    return "common.networkError";

  return "common.unknownError";
}

function codeToI18nKey(code: string): string {
  const map: Record<string, string> = {
    INVALID_CREDENTIALS: "auth.invalidCredentials",
    RATE_LIMIT: "common.rateLimitExceeded",
    NOT_AUTHENTICATED: "auth.notAuthenticated",
    FORBIDDEN: "common.forbidden",
    NOT_FOUND: "common.notFound",
    PDF_NOT_FOUND: "pdf.notFound",
    PDF_FILE_NOT_FOUND: "pdf.fileNotFound",
    UPLOAD_TOO_LARGE: "pdf.uploadTooLarge",
    INVALID_PDF: "pdf.invalidPdf",
    INVALID_FILE_TYPE: "pdf.unsupportedFileType",
    VALIDATION_ERROR: "common.validationError",
    EMAIL_ALREADY_REGISTERED: "auth.emailAlreadyRegistered",
    PASSWORD_TOO_WEAK: "auth.passwordTooWeak",
    RESET_TOKEN_INVALID: "auth.resetInvalidToken",
    RESET_TOKEN_EXPIRED: "auth.resetTokenExpired",
    GOOGLE_AUTH_FAILED: "auth.googleAuthFailed",
    CONVERSION_FAILED: "common.conversionFailed",
    SEARCH_TEXT_EMPTY: "common.searchTextEmpty",
    MERGE_TOO_FEW: "common.mergeTooFew",
    SPLIT_INVALID_RANGE: "common.splitInvalidRange",
    CANNOT_DEMOTE_SUPER_ADMIN: "admin.cannotDemoteSuperAdmin",
    STRIPE_LICENSE_LOCKED: "admin.stripeLicenseLocked",
    BUG_NOT_FOUND: "bugReport.notFound",
    BUG_VOTE_NOT_FOUND: "bugReport.voteNotFound",
    INTERNAL_ERROR: "common.internalError",
  };
  return map[code] || "common.unknownError";
}

function extractMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * Extract a human-readable detail from an error for console logging.
 * Never show this to the user directly — use mapError() for that.
 */
export function extractErrorDetail(err: unknown): string {
  return extractMessage(err);
}
