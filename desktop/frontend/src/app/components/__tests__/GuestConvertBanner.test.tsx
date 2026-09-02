import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GuestConvertBanner from "../GuestConvertBanner";

const mockLogout = vi.fn();
const mockConvertGuest = vi.fn();
const mockPush = vi.fn();

let mockIsGuest = true;

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush }),
}));

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));

vi.mock("../../../shared/api", () => ({
    api: {
        convertGuest: (...args: any[]) => mockConvertGuest(...args),
    },
}));

vi.mock("../../../shared/auth", () => ({
    useAuth: () => ({
        user: mockIsGuest ? { id: "u1", email: "guest@test.com", full_name: "Guest User", is_guest: true } : { id: "u1", email: "test@test.com", full_name: "Test User", is_guest: false },
        logout: (...args: any[]) => mockLogout(...args),
    }),
}));

describe("GuestConvertBanner", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockIsGuest = true;
    });

    it("renders banner for guest users", () => {
        render(<GuestConvertBanner />);
        expect(screen.getByText("tempAccount")).toBeInTheDocument();
        expect(screen.getByText("convert")).toBeInTheDocument();
    });

    it("opens modal on convert click", () => {
        render(<GuestConvertBanner />);
        fireEvent.click(screen.getByText("convert"));
        expect(screen.getByText("convertTitle")).toBeInTheDocument();
        expect(screen.getByText("convertDesc")).toBeInTheDocument();
    });

    it("closes modal on cancel", () => {
        render(<GuestConvertBanner />);
        fireEvent.click(screen.getByText("convert"));
        expect(screen.getByText("convertTitle")).toBeInTheDocument();
        fireEvent.click(screen.getByText("cancel"));
        expect(screen.queryByText("convertTitle")).not.toBeInTheDocument();
    });

    it("calls convertGuest on submit", async () => {
        mockConvertGuest.mockResolvedValue(undefined);
        render(<GuestConvertBanner />);
        fireEvent.click(screen.getByText("convert"));
        fireEvent.change(screen.getByPlaceholderText("namePlaceholder"), { target: { value: "Test User" } });
        fireEvent.change(screen.getByPlaceholderText("emailPlaceholder"), { target: { value: "test@test.com" } });
        fireEvent.change(screen.getByPlaceholderText("passwordPlaceholder"), { target: { value: "pass1234" } });
        fireEvent.click(screen.getByText("convertAccount"));
        await waitFor(() => {
            expect(mockConvertGuest).toHaveBeenCalledWith("test@test.com", "pass1234", "Test User");
        });
    });

    it("shows error on convert failure", async () => {
        mockConvertGuest.mockRejectedValue(new Error("Conversion failed"));
        render(<GuestConvertBanner />);
        fireEvent.click(screen.getByText("convert"));
        fireEvent.change(screen.getByPlaceholderText("namePlaceholder"), { target: { value: "Test" } });
        fireEvent.change(screen.getByPlaceholderText("emailPlaceholder"), { target: { value: "test@test.com" } });
        fireEvent.change(screen.getByPlaceholderText("passwordPlaceholder"), { target: { value: "pass1234" } });
        fireEvent.click(screen.getByText("convertAccount"));
        await waitFor(() => {
            expect(screen.getByText("Conversion failed")).toBeInTheDocument();
        });
    });

    it("returns null for non-guest users", () => {
        mockIsGuest = false;
        const { container } = render(<GuestConvertBanner />);
        expect(container.innerHTML).toBe("");
    });
});
