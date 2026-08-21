import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProfilePage from "../profile/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("../../shared/api", () => ({
  api: {
    unlinkGoogle: vi.fn(),
    deleteAccount: vi.fn(),
  },
}));

vi.mock("../../shared/auth", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "test@test.com", full_name: "Test User" },
    loading: false,
    logout: vi.fn(),
    setUser: vi.fn(),
  }),
}));

describe("ProfilePage", () => {
  it("renders user email", () => {
    render(<ProfilePage />);
    expect(screen.getByText("test@test.com")).toBeInTheDocument();
  });
});
