import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));
vi.mock("../../shared/auth", () => ({ useAuth: () => ({ user: null, loading: false, login: vi.fn() }) }));
vi.mock("../../shared/tauri", () => ({ getApiBaseUrl: () => "http://127.0.0.1:7723" }));
vi.mock("../../components/PasswordInput", () => ({ default: ({ placeholder }: { placeholder: string }) => <input placeholder={placeholder} /> }));
vi.mock("../../components/GoogleLoginButton", () => ({ default: () => <div>GoogleLogin</div> }));

import LoginPage from "../login/page";

describe("LoginPage", () => {
  it("renders without crashing", () => {
    const { container } = render(<LoginPage />);
    expect(container).toBeTruthy();
  });
});
