import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LockUnlockModal from "../LockUnlockModal";

const mockOnClose = vi.fn();
const mockOnSaved = vi.fn();
const mockProtectPdf = vi.fn();
const mockUnlockPdf = vi.fn();

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));

const baseProps = {
  open: true,
  pdfId: "p1",
  pdfName: "test.pdf",
  isProtected: false,
  onClose: mockOnClose,
  onSaved: mockOnSaved,
};

vi.mock("../../shared/api", () => ({
  api: {
    protectPdf: (...args: any[]) => mockProtectPdf(...args),
    unlockPdf: (...args: any[]) => mockUnlockPdf(...args),
  },
}));

describe("LockUnlockModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Lock mode when not protected", () => {
    render(<LockUnlockModal {...baseProps} />);
    expect(screen.getByText("lockTitle")).toBeInTheDocument();
    expect(screen.getByText("newPassword")).toBeInTheDocument();
    expect(screen.getByText("confirmPassword")).toBeInTheDocument();
  });

  it("renders Unlock mode when protected", () => {
    render(<LockUnlockModal {...baseProps} isProtected={true} />);
    expect(screen.getByText("unlockTitle")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("enterPassword")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("reEnterPassword")).not.toBeInTheDocument();
  });

  it("shows error when passwords don't match", () => {
    render(<LockUnlockModal {...baseProps} />);
    const pw = screen.getByPlaceholderText("enterNewPassword");
    const confirm = screen.getByPlaceholderText("reEnterPassword");
    fireEvent.change(pw, { target: { value: "pass123" } });
    fireEvent.change(confirm, { target: { value: "pass456" } });
    fireEvent.click(screen.getByText("lock"));
    expect(screen.getByText("passwordsDoNotMatch")).toBeInTheDocument();
  });

  it("shows error when password is too short", () => {
    render(<LockUnlockModal {...baseProps} />);
    const pw = screen.getByPlaceholderText("enterNewPassword");
    const confirm = screen.getByPlaceholderText("reEnterPassword");
    fireEvent.change(pw, { target: { value: "ab" } });
    fireEvent.change(confirm, { target: { value: "ab" } });
    fireEvent.click(screen.getByText("lock"));
    expect(screen.getByText("passwordMinLength")).toBeInTheDocument();
  });

  it("shows error when password is empty", () => {
    render(<LockUnlockModal {...baseProps} />);
    fireEvent.click(screen.getByText("lock"));
    expect(screen.getByText("passwordRequired")).toBeInTheDocument();
  });

  it("calls protectPdf on valid lock", async () => {
    mockProtectPdf.mockResolvedValueOnce({ id: "p1", is_password_protected: true });
    render(<LockUnlockModal {...baseProps} />);
    const pw = screen.getByPlaceholderText("enterNewPassword");
    const confirm = screen.getByPlaceholderText("reEnterPassword");
    fireEvent.change(pw, { target: { value: "pass1234" } });
    fireEvent.change(confirm, { target: { value: "pass1234" } });
    fireEvent.click(screen.getByText("lock"));
    await waitFor(() => {
      expect(mockProtectPdf).toHaveBeenCalledWith("p1", "pass1234");
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("calls unlockPdf on valid unlock", async () => {
    mockUnlockPdf.mockResolvedValueOnce({ id: "p1", is_password_protected: false });
    render(<LockUnlockModal {...baseProps} isProtected={true} />);
    const pw = screen.getByPlaceholderText("enterPassword");
    fireEvent.change(pw, { target: { value: "pass1234" } });
    fireEvent.click(screen.getByText("unlock"));
    await waitFor(() => {
      expect(mockUnlockPdf).toHaveBeenCalledWith("p1", "pass1234");
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("shows error on protectPdf failure", async () => {
    mockProtectPdf.mockRejectedValueOnce(new Error("Failed to lock"));
    render(<LockUnlockModal {...baseProps} />);
    const pw = screen.getByPlaceholderText("enterNewPassword");
    const confirm = screen.getByPlaceholderText("reEnterPassword");
    fireEvent.change(pw, { target: { value: "pass1234" } });
    fireEvent.change(confirm, { target: { value: "pass1234" } });
    fireEvent.click(screen.getByText("lock"));
    await waitFor(() => {
      expect(screen.getByText("Failed to lock")).toBeInTheDocument();
    });
  });

  it("shows error on unlockPdf failure", async () => {
    mockUnlockPdf.mockRejectedValueOnce(new Error("Wrong password"));
    render(<LockUnlockModal {...baseProps} isProtected={true} />);
    const pw = screen.getByPlaceholderText("enterPassword");
    fireEvent.change(pw, { target: { value: "wrong" } });
    fireEvent.click(screen.getByText("unlock"));
    await waitFor(() => {
      expect(screen.getByText("Wrong password")).toBeInTheDocument();
    });
  });

  it("calls onClose when Cancel is clicked", () => {
    render(<LockUnlockModal {...baseProps} />);
    fireEvent.click(screen.getByText("cancel"));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("does not render when open is false", () => {
    const { container } = render(<LockUnlockModal {...baseProps} open={false} />);
    expect(container.innerHTML).toBe("");
  });

  it("toggles password visibility", () => {
    render(<LockUnlockModal {...baseProps} />);
    const pw = screen.getByPlaceholderText("enterNewPassword");
    expect(pw).toHaveAttribute("type", "password");
    const toggleBtn = document.querySelectorAll('button[tabindex="-1"]');
    fireEvent.click(toggleBtn[0]);
    expect(pw).toHaveAttribute("type", "text");
  });

  it("supports Enter key for lock", () => {
    render(<LockUnlockModal {...baseProps} />);
    const pw = screen.getByPlaceholderText("enterNewPassword");
    const confirm = screen.getByPlaceholderText("reEnterPassword");
    fireEvent.change(pw, { target: { value: "ab" } });
    fireEvent.change(confirm, { target: { value: "ab" } });
    fireEvent.keyDown(pw, { key: "Enter" });
    expect(screen.getByText("passwordMinLength")).toBeInTheDocument();
  });

  it("supports Enter key for unlock", () => {
    render(<LockUnlockModal {...baseProps} isProtected={true} />);
    const pw = screen.getByPlaceholderText("enterPassword");
    fireEvent.keyDown(pw, { key: "Enter" });
    expect(screen.getByText("passwordRequired")).toBeInTheDocument();
  });
});
