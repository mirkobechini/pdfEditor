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
