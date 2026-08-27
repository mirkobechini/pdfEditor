import { describe, it, expect } from "vitest";
import { mapError, extractErrorDetail, ErrorCode } from "../error-map";

describe("mapError — JSON error codes", () => {
  it("maps INVALID_CREDENTIALS", () => {
    const err = new Error(
      JSON.stringify({ code: "INVALID_CREDENTIALS", detail: "Bad creds" }),
    );
    expect(mapError(err)).toBe("auth.invalidCredentials");
  });

  it("maps RATE_LIMIT", () => {
    const err = new Error(
      JSON.stringify({ code: "RATE_LIMIT", detail: "Slow" }),
    );
    expect(mapError(err)).toBe("common.rateLimitExceeded");
  });

  it("maps NOT_AUTHENTICATED", () => {
    const err = new Error(
      JSON.stringify({ code: "NOT_AUTHENTICATED", detail: "No auth" }),
    );
    expect(mapError(err)).toBe("auth.notAuthenticated");
  });

  it("maps FORBIDDEN", () => {
    const err = new Error(JSON.stringify({ code: "FORBIDDEN", detail: "No" }));
    expect(mapError(err)).toBe("common.forbidden");
  });

  it("maps NOT_FOUND", () => {
    const err = new Error(
      JSON.stringify({ code: "NOT_FOUND", detail: "Missing" }),
    );
    expect(mapError(err)).toBe("common.notFound");
  });

  it("maps PDF_NOT_FOUND", () => {
    const err = new Error(
      JSON.stringify({ code: "PDF_NOT_FOUND", detail: "No pdf" }),
    );
    expect(mapError(err)).toBe("pdf.notFound");
  });

  it("maps PDF_FILE_NOT_FOUND", () => {
    const err = new Error(
      JSON.stringify({ code: "PDF_FILE_NOT_FOUND", detail: "No file" }),
    );
    expect(mapError(err)).toBe("pdf.fileNotFound");
  });

  it("maps UPLOAD_TOO_LARGE", () => {
    const err = new Error(
      JSON.stringify({ code: "UPLOAD_TOO_LARGE", detail: "Too big" }),
    );
    expect(mapError(err)).toBe("pdf.uploadTooLarge");
  });

  it("maps INVALID_PDF", () => {
    const err = new Error(
      JSON.stringify({ code: "INVALID_PDF", detail: "Bad" }),
    );
    expect(mapError(err)).toBe("pdf.invalidPdf");
  });

  it("maps INVALID_FILE_TYPE", () => {
    const err = new Error(
      JSON.stringify({ code: "INVALID_FILE_TYPE", detail: "Wrong type" }),
    );
    expect(mapError(err)).toBe("pdf.unsupportedFileType");
  });

  it("maps VALIDATION_ERROR", () => {
    const err = new Error(
      JSON.stringify({ code: "VALIDATION_ERROR", detail: "Invalid" }),
    );
    expect(mapError(err)).toBe("common.validationError");
  });

  it("maps EMAIL_ALREADY_REGISTERED", () => {
    const err = new Error(
      JSON.stringify({ code: "EMAIL_ALREADY_REGISTERED", detail: "Exists" }),
    );
    expect(mapError(err)).toBe("auth.emailAlreadyRegistered");
  });

  it("maps EMAIL_QUOTA_EXCEEDED", () => {
    const err = new Error(
      JSON.stringify({ code: "EMAIL_QUOTA_EXCEEDED", detail: "Quota" }),
    );
    expect(mapError(err)).toBe("auth.emailQuotaExceeded");
  });

  it("maps PASSWORD_TOO_WEAK", () => {
    const err = new Error(
      JSON.stringify({ code: "PASSWORD_TOO_WEAK", detail: "Weak" }),
    );
    expect(mapError(err)).toBe("auth.passwordTooWeak");
  });

  it("maps RESET_TOKEN_INVALID", () => {
    const err = new Error(
      JSON.stringify({ code: "RESET_TOKEN_INVALID", detail: "Bad token" }),
    );
    expect(mapError(err)).toBe("auth.resetInvalidToken");
  });

  it("maps RESET_TOKEN_EXPIRED", () => {
    const err = new Error(
      JSON.stringify({ code: "RESET_TOKEN_EXPIRED", detail: "Expired" }),
    );
    expect(mapError(err)).toBe("auth.resetTokenExpired");
  });

  it("maps GOOGLE_AUTH_FAILED", () => {
    const err = new Error(
      JSON.stringify({ code: "GOOGLE_AUTH_FAILED", detail: "Google no" }),
    );
    expect(mapError(err)).toBe("auth.googleAuthFailed");
  });

  it("maps CONVERSION_FAILED", () => {
    const err = new Error(
      JSON.stringify({ code: "CONVERSION_FAILED", detail: "Convert no" }),
    );
    expect(mapError(err)).toBe("common.conversionFailed");
  });

  it("maps SEARCH_TEXT_EMPTY", () => {
    const err = new Error(
      JSON.stringify({ code: "SEARCH_TEXT_EMPTY", detail: "Empty" }),
    );
    expect(mapError(err)).toBe("common.searchTextEmpty");
  });

  it("maps MERGE_TOO_FEW", () => {
    const err = new Error(
      JSON.stringify({ code: "MERGE_TOO_FEW", detail: "Few" }),
    );
    expect(mapError(err)).toBe("common.mergeTooFew");
  });

  it("maps SPLIT_INVALID_RANGE", () => {
    const err = new Error(
      JSON.stringify({ code: "SPLIT_INVALID_RANGE", detail: "Range" }),
    );
    expect(mapError(err)).toBe("common.splitInvalidRange");
  });

  it("maps CANNOT_DEMOTE_SUPER_ADMIN", () => {
    const err = new Error(
      JSON.stringify({
        code: "CANNOT_DEMOTE_SUPER_ADMIN",
        detail: "No demote",
      }),
    );
    expect(mapError(err)).toBe("admin.cannotDemoteSuperAdmin");
  });

  it("maps STRIPE_LICENSE_LOCKED", () => {
    const err = new Error(
      JSON.stringify({ code: "STRIPE_LICENSE_LOCKED", detail: "Locked" }),
    );
    expect(mapError(err)).toBe("admin.stripeLicenseLocked");
  });

  it("maps BUG_NOT_FOUND", () => {
    const err = new Error(
      JSON.stringify({ code: "BUG_NOT_FOUND", detail: "No bug" }),
    );
    expect(mapError(err)).toBe("bugReport.notFound");
  });

  it("maps BUG_VOTE_NOT_FOUND", () => {
    const err = new Error(
      JSON.stringify({ code: "BUG_VOTE_NOT_FOUND", detail: "No vote" }),
    );
    expect(mapError(err)).toBe("bugReport.voteNotFound");
  });

  it("maps INTERNAL_ERROR", () => {
    const err = new Error(
      JSON.stringify({ code: "INTERNAL_ERROR", detail: "Oops" }),
    );
    expect(mapError(err)).toBe("common.internalError");
  });

  it("maps unknown code to unknownError", () => {
    const err = new Error(
      JSON.stringify({ code: "SOMETHING_NEW", detail: "X" }),
    );
    expect(mapError(err)).toBe("common.unknownError");
  });

  it("handles invalid JSON message", () => {
    const err = new Error("{not valid json");
    expect(mapError(err)).toBe("common.unknownError");
  });
});

describe("mapError — plain text messages", () => {
  it("maps RATE_LIMIT string", () => {
    expect(mapError("RATE_LIMIT")).toBe("common.rateLimitExceeded");
  });

  it("maps Email already registered", () => {
    expect(mapError("Email already registered")).toBe(
      "auth.emailAlreadyRegistered",
    );
  });

  it("maps Invalid email or password", () => {
    expect(mapError("Invalid email or password")).toBe(
      "auth.invalidCredentials",
    );
  });

  it("maps Not authenticated", () => {
    expect(mapError("Not authenticated")).toBe("auth.notAuthenticated");
  });

  it("maps Admin access required", () => {
    expect(mapError("Admin access required")).toBe("common.forbidden");
  });

  it("maps PDF not found", () => {
    expect(mapError("PDF not found")).toBe("pdf.notFound");
  });

  it("maps file not found on disk", () => {
    expect(mapError("file not found on disk")).toBe("pdf.fileNotFound");
  });

  it("maps too large", () => {
    expect(mapError("File is too large")).toBe("pdf.uploadTooLarge");
  });

  it("maps Invalid PDF", () => {
    expect(mapError("Invalid PDF")).toBe("pdf.invalidPdf");
  });

  it("maps Only PDF files are allowed", () => {
    expect(mapError("Only PDF files are allowed")).toBe("pdf.onlyPdfAllowed");
  });

  it("maps Unsupported file type", () => {
    expect(mapError("Unsupported file type")).toBe("pdf.unsupportedFileType");
  });

  it("maps Invalid or expired reset token", () => {
    expect(mapError("Invalid or expired reset token")).toBe(
      "auth.resetInvalidToken",
    );
  });

  it("maps Reset token has expired", () => {
    expect(mapError("Reset token has expired")).toBe("auth.resetTokenExpired");
  });

  it("maps Password must be at least", () => {
    expect(mapError("Password must be at least 8 characters")).toBe(
      "auth.passwordTooShort",
    );
  });

  it("maps must contain at least one uppercase", () => {
    expect(mapError("must contain at least one uppercase")).toBe(
      "auth.passwordMissingUppercase",
    );
  });

  it("maps must contain at least one lowercase", () => {
    expect(mapError("must contain at least one lowercase")).toBe(
      "auth.passwordMissingLowercase",
    );
  });

  it("maps must contain at least one number", () => {
    expect(mapError("must contain at least one number")).toBe(
      "auth.passwordMissingNumber",
    );
  });

  it("maps Network error", () => {
    expect(mapError("Network error")).toBe("common.networkError");
  });

  it("maps Failed to fetch", () => {
    expect(mapError("Failed to fetch")).toBe("common.networkError");
  });

  it("maps unknown string to unknownError", () => {
    expect(mapError("random message")).toBe("common.unknownError");
  });
});

describe("extractErrorDetail", () => {
  it("returns message for Error", () => {
    expect(extractErrorDetail(new Error("Something"))).toBe("Something");
  });

  it("returns string as-is", () => {
    expect(extractErrorDetail("plain text")).toBe("plain text");
  });

  it("returns String() for other values", () => {
    expect(extractErrorDetail(42)).toBe("42");
    expect(extractErrorDetail(null)).toBe("null");
  });
});

describe("ErrorCode", () => {
  it("exposes constant values", () => {
    expect(ErrorCode.INVALID_CREDENTIALS).toBe("INVALID_CREDENTIALS");
    expect(ErrorCode.PDF_NOT_FOUND).toBe("PDF_NOT_FOUND");
  });
});
