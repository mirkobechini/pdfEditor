import {
  mapError,
  extractErrorDetail,
  ErrorCode,
} from "../src/shared/error-map";

describe("mapError", () => {
  it("returns correct key for EMAIL_NOT_FOUND", () => {
    const err = new Error(
      JSON.stringify({ code: "EMAIL_NOT_FOUND", detail: "Email not found" }),
    );
    expect(mapError(err)).toBe("auth.emailNotFound");
  });

  it("returns correct key for WRONG_PASSWORD", () => {
    const err = new Error(
      JSON.stringify({ code: "WRONG_PASSWORD", detail: "Wrong password" }),
    );
    expect(mapError(err)).toBe("auth.wrongPassword");
  });

  it("returns correct key for RATE_LIMIT", () => {
    const err = new Error(
      JSON.stringify({ code: "RATE_LIMIT", detail: "Too many requests" }),
    );
    expect(mapError(err)).toBe("common.rateLimitExceeded");
  });

  it("maps plain text EMAIL_NOT_FOUND string", () => {
    expect(mapError("EMAIL_NOT_FOUND")).toBe("auth.emailNotFound");
  });

  it("maps plain text 'Invalid email or password'", () => {
    expect(mapError("Invalid email or password")).toBe(
      "auth.invalidCredentials",
    );
  });

  it("maps plain text 'Network error'", () => {
    expect(mapError("Network error")).toBe("common.networkError");
  });

  it("returns unknownError for unmapped errors", () => {
    expect(mapError("Some random error")).toBe("common.unknownError");
  });

  it("returns unknownError for empty string", () => {
    expect(mapError("")).toBe("common.unknownError");
  });

  it("handles Error object with unknown message", () => {
    const err = new Error("Something completely unexpected");
    expect(mapError(err)).toBe("common.unknownError");
  });

  it("handles string 'RATE_LIMIT' directly", () => {
    expect(mapError("RATE_LIMIT")).toBe("common.rateLimitExceeded");
  });

  it("maps 'Admin access required' to forbidden", () => {
    expect(mapError("Admin access required")).toBe("common.forbidden");
  });

  it("maps 'must be at least' to passwordTooShort", () => {
    expect(mapError("Password must be at least 8 characters")).toBe(
      "auth.passwordTooShort",
    );
  });

  it("maps 'Failed to fetch' to networkError", () => {
    expect(mapError("Failed to fetch")).toBe("common.networkError");
  });

  it("maps 'Email already registered' string", () => {
    expect(mapError("Email already registered")).toBe(
      "auth.emailAlreadyRegistered",
    );
  });

  it("maps 'Not authenticated' string", () => {
    expect(mapError("Not authenticated")).toBe("auth.notAuthenticated");
  });

  it("maps 'PDF not found' string", () => {
    expect(mapError("PDF not found")).toBe("pdf.notFound");
  });

  it("maps 'file not found on disk' string", () => {
    expect(mapError("file not found on disk")).toBe("pdf.fileNotFound");
  });

  it("maps 'too large' string", () => {
    expect(mapError("File too large")).toBe("pdf.uploadTooLarge");
  });

  it("maps 'Invalid PDF' string", () => {
    expect(mapError("Invalid PDF")).toBe("pdf.invalidPdf");
  });

  it("maps 'Only PDF files' string", () => {
    expect(mapError("Only PDF files are allowed")).toBe("pdf.onlyPdfAllowed");
  });

  it("maps 'Unsupported file type' string", () => {
    expect(mapError("Unsupported file type")).toBe("pdf.unsupportedFileType");
  });

  it("maps 'Invalid or expired reset token' string", () => {
    expect(mapError("Invalid or expired reset token")).toBe(
      "auth.resetInvalidToken",
    );
  });

  it("maps 'WRONG_PASSWORD' plain text string", () => {
    expect(mapError("WRONG_PASSWORD")).toBe("auth.wrongPassword");
  });

  it("maps 'Reset token has expired' string", () => {
    expect(mapError("Reset token has expired")).toBe("auth.resetTokenExpired");
  });

  it("maps JSON error with code NOT_AUTHENTICATED", () => {
    const err = new Error(
      JSON.stringify({
        code: "NOT_AUTHENTICATED",
        detail: "Not authenticated",
      }),
    );
    expect(mapError(err)).toBe("auth.notAuthenticated");
  });

  it("maps JSON error with code FORBIDDEN", () => {
    const err = new Error(
      JSON.stringify({ code: "FORBIDDEN", detail: "Forbidden" }),
    );
    expect(mapError(err)).toBe("common.forbidden");
  });

  it("maps JSON error with code NOT_FOUND", () => {
    const err = new Error(
      JSON.stringify({ code: "NOT_FOUND", detail: "Not found" }),
    );
    expect(mapError(err)).toBe("common.notFound");
  });

  it("maps JSON error with code PDF_NOT_FOUND", () => {
    const err = new Error(
      JSON.stringify({ code: "PDF_NOT_FOUND", detail: "PDF not found" }),
    );
    expect(mapError(err)).toBe("pdf.notFound");
  });

  it("maps JSON error with code VALIDATION_ERROR", () => {
    const err = new Error(
      JSON.stringify({ code: "VALIDATION_ERROR", detail: "Invalid input" }),
    );
    expect(mapError(err)).toBe("common.validationError");
  });

  it("maps JSON error with code EMAIL_QUOTA_EXCEEDED", () => {
    const err = new Error(
      JSON.stringify({
        code: "EMAIL_QUOTA_EXCEEDED",
        detail: "Quota exceeded",
      }),
    );
    expect(mapError(err)).toBe("auth.emailQuotaExceeded");
  });

  it("maps JSON error with code PASSWORD_TOO_WEAK", () => {
    const err = new Error(
      JSON.stringify({ code: "PASSWORD_TOO_WEAK", detail: "Too weak" }),
    );
    expect(mapError(err)).toBe("auth.passwordTooWeak");
  });

  it("maps JSON error with code RESET_TOKEN_INVALID", () => {
    const err = new Error(
      JSON.stringify({
        code: "RESET_TOKEN_INVALID",
        detail: "Token invalid",
      }),
    );
    expect(mapError(err)).toBe("auth.resetInvalidToken");
  });

  it("maps JSON error with code RESET_TOKEN_EXPIRED", () => {
    const err = new Error(
      JSON.stringify({
        code: "RESET_TOKEN_EXPIRED",
        detail: "Token expired",
      }),
    );
    expect(mapError(err)).toBe("auth.resetTokenExpired");
  });

  it("maps JSON error with code GOOGLE_AUTH_FAILED", () => {
    const err = new Error(
      JSON.stringify({
        code: "GOOGLE_AUTH_FAILED",
        detail: "Google auth failed",
      }),
    );
    expect(mapError(err)).toBe("auth.googleAuthFailed");
  });

  it("maps JSON error with code CONVERSION_FAILED", () => {
    const err = new Error(
      JSON.stringify({
        code: "CONVERSION_FAILED",
        detail: "Conversion failed",
      }),
    );
    expect(mapError(err)).toBe("common.conversionFailed");
  });

  it("maps JSON error with code SEARCH_TEXT_EMPTY", () => {
    const err = new Error(
      JSON.stringify({ code: "SEARCH_TEXT_EMPTY", detail: "Empty search" }),
    );
    expect(mapError(err)).toBe("common.searchTextEmpty");
  });

  it("maps JSON error with code MERGE_TOO_FEW", () => {
    const err = new Error(
      JSON.stringify({ code: "MERGE_TOO_FEW", detail: "Too few PDFs" }),
    );
    expect(mapError(err)).toBe("common.mergeTooFew");
  });

  it("maps JSON error with code SPLIT_INVALID_RANGE", () => {
    const err = new Error(
      JSON.stringify({
        code: "SPLIT_INVALID_RANGE",
        detail: "Invalid range",
      }),
    );
    expect(mapError(err)).toBe("common.splitInvalidRange");
  });

  it("maps JSON error with code CANNOT_DEMOTE_SUPER_ADMIN", () => {
    const err = new Error(
      JSON.stringify({
        code: "CANNOT_DEMOTE_SUPER_ADMIN",
        detail: "Cannot demote",
      }),
    );
    expect(mapError(err)).toBe("admin.cannotDemoteSuperAdmin");
  });

  it("maps JSON error with code STRIPE_LICENSE_LOCKED", () => {
    const err = new Error(
      JSON.stringify({
        code: "STRIPE_LICENSE_LOCKED",
        detail: "License locked",
      }),
    );
    expect(mapError(err)).toBe("admin.stripeLicenseLocked");
  });

  it("maps JSON error with code BUG_NOT_FOUND", () => {
    const err = new Error(
      JSON.stringify({ code: "BUG_NOT_FOUND", detail: "Bug not found" }),
    );
    expect(mapError(err)).toBe("bugReport.notFound");
  });

  it("maps JSON error with code BUG_VOTE_NOT_FOUND", () => {
    const err = new Error(
      JSON.stringify({
        code: "BUG_VOTE_NOT_FOUND",
        detail: "Vote not found",
      }),
    );
    expect(mapError(err)).toBe("bugReport.voteNotFound");
  });

  it("maps JSON error with code INTERNAL_ERROR", () => {
    const err = new Error(
      JSON.stringify({ code: "INTERNAL_ERROR", detail: "Internal error" }),
    );
    expect(mapError(err)).toBe("common.internalError");
  });

  it("maps JSON error with unknown code to unknownError", () => {
    const err = new Error(
      JSON.stringify({ code: "UNKNOWN_CODE", detail: "Something" }),
    );
    expect(mapError(err)).toBe("common.unknownError");
  });

  it("handles non-JSON string starting with '{'", () => {
    // A string that starts with '{' but is not valid JSON
    expect(mapError("{this is not json}")).toBe("common.unknownError");
  });

  it("handles JSON with no code property (falls through)", () => {
    const err = new Error(JSON.stringify({ detail: "No code here" }));
    expect(mapError(err)).toBe("common.unknownError");
  });

  it("handles JSON with empty code property (falsy)", () => {
    const err = new Error(JSON.stringify({ code: "", detail: "Empty code" }));
    expect(mapError(err)).toBe("common.unknownError");
  });
});

describe("extractErrorDetail", () => {
  it("returns message from Error object", () => {
    expect(extractErrorDetail(new Error("test message"))).toBe("test message");
  });

  it("returns string directly", () => {
    expect(extractErrorDetail("direct string")).toBe("direct string");
  });

  it("returns string representation for non-Error objects", () => {
    expect(extractErrorDetail({ foo: "bar" })).toBe("[object Object]");
  });
});
