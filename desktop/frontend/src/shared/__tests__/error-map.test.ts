import { describe, it, expect } from "vitest";
import { mapError, extractErrorDetail, ErrorCode } from "../error-map";

describe("mapError", () => {
  // JSON error codes (from backend error_response helper)
  it("maps INVALID_CREDENTIALS to auth.invalidCredentials", () => {
    expect(
      mapError(
        JSON.stringify({
          code: "INVALID_CREDENTIALS",
          detail: "Incorrect password",
        }),
      ),
    ).toBe("auth.invalidCredentials");
  });

  it("maps EMAIL_NOT_FOUND to auth.emailNotFound", () => {
    expect(
      mapError(
        JSON.stringify({ code: "EMAIL_NOT_FOUND", detail: "Email not found" }),
      ),
    ).toBe("auth.emailNotFound");
  });

  it("maps WRONG_PASSWORD to auth.wrongPassword", () => {
    expect(
      mapError(
        JSON.stringify({ code: "WRONG_PASSWORD", detail: "Wrong password" }),
      ),
    ).toBe("auth.wrongPassword");
  });

  it("maps RATE_LIMIT to common.rateLimitExceeded", () => {
    expect(
      mapError(
        JSON.stringify({ code: "RATE_LIMIT", detail: "Too many requests" }),
      ),
    ).toBe("common.rateLimitExceeded");
  });

  it("maps NOT_AUTHENTICATED to auth.notAuthenticated", () => {
    expect(mapError(JSON.stringify({ code: "NOT_AUTHENTICATED" }))).toBe(
      "auth.notAuthenticated",
    );
  });

  it("maps FORBIDDEN to common.forbidden", () => {
    expect(mapError(JSON.stringify({ code: "FORBIDDEN" }))).toBe(
      "common.forbidden",
    );
  });

  it("maps NOT_FOUND to common.notFound", () => {
    expect(mapError(JSON.stringify({ code: "NOT_FOUND" }))).toBe(
      "common.notFound",
    );
  });

  it("maps PDF_NOT_FOUND to pdf.notFound", () => {
    expect(mapError(JSON.stringify({ code: "PDF_NOT_FOUND" }))).toBe(
      "pdf.notFound",
    );
  });

  it("maps PDF_FILE_NOT_FOUND to pdf.fileNotFound", () => {
    expect(mapError(JSON.stringify({ code: "PDF_FILE_NOT_FOUND" }))).toBe(
      "pdf.fileNotFound",
    );
  });

  it("maps UPLOAD_TOO_LARGE to pdf.uploadTooLarge", () => {
    expect(mapError(JSON.stringify({ code: "UPLOAD_TOO_LARGE" }))).toBe(
      "pdf.uploadTooLarge",
    );
  });

  it("maps INVALID_PDF to pdf.invalidPdf", () => {
    expect(mapError(JSON.stringify({ code: "INVALID_PDF" }))).toBe(
      "pdf.invalidPdf",
    );
  });

  it("maps INVALID_FILE_TYPE to pdf.unsupportedFileType", () => {
    expect(mapError(JSON.stringify({ code: "INVALID_FILE_TYPE" }))).toBe(
      "pdf.unsupportedFileType",
    );
  });

  it("maps VALIDATION_ERROR to common.validationError", () => {
    expect(mapError(JSON.stringify({ code: "VALIDATION_ERROR" }))).toBe(
      "common.validationError",
    );
  });

  it("maps EMAIL_ALREADY_REGISTERED to auth.emailAlreadyRegistered", () => {
    expect(mapError(JSON.stringify({ code: "EMAIL_ALREADY_REGISTERED" }))).toBe(
      "auth.emailAlreadyRegistered",
    );
  });

  it("maps PASSWORD_TOO_WEAK to auth.passwordTooWeak", () => {
    expect(mapError(JSON.stringify({ code: "PASSWORD_TOO_WEAK" }))).toBe(
      "auth.passwordTooWeak",
    );
  });

  it("maps RESET_TOKEN_INVALID to auth.resetInvalidToken", () => {
    expect(mapError(JSON.stringify({ code: "RESET_TOKEN_INVALID" }))).toBe(
      "auth.resetInvalidToken",
    );
  });

  it("maps RESET_TOKEN_EXPIRED to auth.resetTokenExpired", () => {
    expect(mapError(JSON.stringify({ code: "RESET_TOKEN_EXPIRED" }))).toBe(
      "auth.resetTokenExpired",
    );
  });

  it("maps GOOGLE_AUTH_FAILED to auth.googleAuthFailed", () => {
    expect(mapError(JSON.stringify({ code: "GOOGLE_AUTH_FAILED" }))).toBe(
      "auth.googleAuthFailed",
    );
  });

  it("maps CONVERSION_FAILED to common.conversionFailed", () => {
    expect(mapError(JSON.stringify({ code: "CONVERSION_FAILED" }))).toBe(
      "common.conversionFailed",
    );
  });

  it("maps SEARCH_TEXT_EMPTY to common.searchTextEmpty", () => {
    expect(mapError(JSON.stringify({ code: "SEARCH_TEXT_EMPTY" }))).toBe(
      "common.searchTextEmpty",
    );
  });

  it("maps MERGE_TOO_FEW to common.mergeTooFew", () => {
    expect(mapError(JSON.stringify({ code: "MERGE_TOO_FEW" }))).toBe(
      "common.mergeTooFew",
    );
  });

  it("maps SPLIT_INVALID_RANGE to common.splitInvalidRange", () => {
    expect(mapError(JSON.stringify({ code: "SPLIT_INVALID_RANGE" }))).toBe(
      "common.splitInvalidRange",
    );
  });

  it("maps INTERNAL_ERROR to common.internalError", () => {
    expect(mapError(JSON.stringify({ code: "INTERNAL_ERROR" }))).toBe(
      "common.internalError",
    );
  });

  it("maps unknown code to common.unknownError", () => {
    expect(mapError(JSON.stringify({ code: "UNKNOWN_CODE" }))).toBe(
      "common.unknownError",
    );
  });

  // Plain text messages (legacy fallback)
  it('maps "Email already registered" text', () => {
    expect(mapError("Email already registered")).toBe(
      "auth.emailAlreadyRegistered",
    );
  });

  it('maps "EMAIL_NOT_FOUND" text', () => {
    expect(mapError("EMAIL_NOT_FOUND")).toBe("auth.emailNotFound");
  });

  it('maps "WRONG_PASSWORD" text', () => {
    expect(mapError("WRONG_PASSWORD")).toBe("auth.wrongPassword");
  });

  it('maps "Invalid email or password" text', () => {
    expect(mapError("Invalid email or password")).toBe(
      "auth.invalidCredentials",
    );
  });

  it('maps "Not authenticated" text', () => {
    expect(mapError("Not authenticated")).toBe("auth.notAuthenticated");
  });

  it('maps "Admin access required" text', () => {
    expect(mapError("Admin access required")).toBe("common.forbidden");
  });

  it('maps "PDF not found" text', () => {
    expect(mapError("PDF not found")).toBe("pdf.notFound");
  });

  it('maps "file not found on disk" text', () => {
    expect(mapError("file not found on disk")).toBe("pdf.fileNotFound");
  });

  it('maps "too large" text', () => {
    expect(mapError("too large")).toBe("pdf.uploadTooLarge");
  });

  it('maps "Invalid PDF" text', () => {
    expect(mapError("Invalid PDF")).toBe("pdf.invalidPdf");
  });

  it('maps "Only PDF files are allowed" text', () => {
    expect(mapError("Only PDF files are allowed")).toBe("pdf.onlyPdfAllowed");
  });

  it('maps "Invalid or expired reset token" text', () => {
    expect(mapError("Invalid or expired reset token")).toBe(
      "auth.resetInvalidToken",
    );
  });

  it('maps "Reset token has expired" text', () => {
    expect(mapError("Reset token has expired")).toBe("auth.resetTokenExpired");
  });

  it('maps "Password must be at least" text', () => {
    expect(mapError("Password must be at least 8 characters")).toBe(
      "auth.passwordTooShort",
    );
  });

  it('maps "Network error" text', () => {
    expect(mapError("Network error")).toBe("common.networkError");
  });

  it('maps "Failed to fetch" text', () => {
    expect(mapError("Failed to fetch")).toBe("common.networkError");
  });

  it("maps unknown text to common.unknownError", () => {
    expect(mapError("Some random error")).toBe("common.unknownError");
  });

  // Error object with message
  it("maps Error object with JSON message", () => {
    const err = new Error(JSON.stringify({ code: "PDF_NOT_FOUND" }));
    expect(mapError(err)).toBe("pdf.notFound");
  });

  it("maps Error object with plain text message", () => {
    const err = new Error("Invalid PDF");
    expect(mapError(err)).toBe("pdf.invalidPdf");
  });

  it("maps Error object with unknown message", () => {
    const err = new Error("Something went wrong");
    expect(mapError(err)).toBe("common.unknownError");
  });

  // Edge cases
  it("handles empty string", () => {
    expect(mapError("")).toBe("common.unknownError");
  });

  it("handles null", () => {
    expect(mapError(null)).toBe("common.unknownError");
  });

  it("handles undefined", () => {
    expect(mapError(undefined)).toBe("common.unknownError");
  });

  it("handles number", () => {
    expect(mapError(404)).toBe("common.unknownError");
  });

  it("handles malformed JSON in message", () => {
    expect(mapError("{invalid json}")).toBe("common.unknownError");
  });
});

describe("extractErrorDetail", () => {
  it("extracts message from Error", () => {
    expect(extractErrorDetail(new Error("test error"))).toBe("test error");
  });

  it("extracts message from string", () => {
    expect(extractErrorDetail("direct string")).toBe("direct string");
  });

  it("extracts message from number", () => {
    expect(extractErrorDetail(500)).toBe("500");
  });
});

describe("ErrorCode constants", () => {
  it("has INVALID_CREDENTIALS defined", () => {
    expect(ErrorCode.INVALID_CREDENTIALS).toBe("INVALID_CREDENTIALS");
  });

  it("has PDF_NOT_FOUND defined", () => {
    expect(ErrorCode.PDF_NOT_FOUND).toBe("PDF_NOT_FOUND");
  });
});
