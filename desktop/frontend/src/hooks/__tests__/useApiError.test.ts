import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useApiError } from "../useApiError";

const messages: Record<string, string> = {
  "common.unknownError": "Errore imprevisto",
  "common.validationError": "Dati di input non validi",
};
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => messages[key] ?? key,
}));

describe("useApiError", () => {
  it("translates known errors without technical detail", () => {
    const { result } = renderHook(() => useApiError());
    const err = new Error(JSON.stringify({ code: "VALIDATION_ERROR", detail: "x" }));
    expect(result.current.apiError(err)).toBe("Dati di input non validi");
  });

  it("apiError stays free of technical detail for unknown errors", () => {
    const { result } = renderHook(() => useApiError());
    expect(result.current.apiError(new Error("HTTP 404 Not Found"))).toBe("Errore imprevisto");
  });

  it("appends a short technical detail for unknown errors", () => {
    const { result } = renderHook(() => useApiError());
    expect(result.current.apiErrorWithDetail(new Error("HTTP 404 Not Found"))).toBe(
      "Errore imprevisto (HTTP 404 Not Found)",
    );
  });

  it("truncates very long details", () => {
    const { result } = renderHook(() => useApiError());
    const out = result.current.apiErrorWithDetail(new Error("x".repeat(500)));
    expect(out.length).toBeLessThan(160);
  });
});
