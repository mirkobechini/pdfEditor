import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LicensePage from "../license/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));

vi.mock("../../shared/auth", () => ({
  useAuth: () => ({ user: { id: "u1", email: "test@test.com", license_tier: "Free" } }),
}));

describe("LicensePage", () => {
  it("renders license page with user tier", () => {
    render(<LicensePage />);
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("title")).toBeInTheDocument();
  });
});
