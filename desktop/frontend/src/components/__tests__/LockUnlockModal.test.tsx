import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LockUnlockModal from "../LockUnlockModal";

const mockOnClose = vi.fn();
const mockOnSaved = vi.fn();
const mockProtectPdf = vi.fn();
const mockUnlockPdf = vi.fn();

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
    expect(screen.getByText("Lock PDF")).toBeInTheDocument();
    expect(screen.getByText("New password")).toBeInTheDocument();
    expect(screen.getByText("Confirm password")).toBeInTheDocument();
  });

  it("renders Unlock mode when protected", () => {
    render(<LockUnlockModal {...baseProps} isProtected={true} />);
    expect(screen.getByText("Unlock PDF")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter password")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Re-enter password")).not.toBeInTheDocument();
  });

  it("shows error when passwords don't match", () => {
    render(<LockUnlockModal {...baseProps} />);
    const pw = screen.getByPlaceholderText("Enter new password");
    const confirm = screen.getByPlaceholderText("Re-enter password");
    fireEvent.change(pw, { target: { value: "pass123" } });
    fireEvent.change(confirm, { target: { value: "pass456" } });
    fireEvent.click(screen.getByText("Lock"));
    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
  });

  it("shows error when password is too short", () => {
    render(<LockUnlockModal {...baseProps} />);
    const pw = screen.getByPlaceholderText("Enter new password");
    const confirm = screen.getByPlaceholderText("Re-enter password");
    fireEvent.change(pw, { target: { value: "ab" } });
    fireEvent.change(confirm, { target: { value: "ab" } });
    fireEvent.click(screen.getByText("Lock"));
    expect(screen.getByText("Password must be at least 4 characters")).toBeInTheDocument();
  });

  it("shows error when password is empty", () => {
    render(<LockUnlockModal {...baseProps} />);
    fireEvent.click(screen.getByText("Lock"));
    expect(screen.getByText("Password is required")).toBeInTheDocument();
  });

  it("calls protectPdf on valid lock", async () => {
    mockProtectPdf.mockResolvedValueOnce({ id: "p1", is_password_protected: true });
    render(<LockUnlockModal {...baseProps} />);
    const pw = screen.getByPlaceholderText("Enter new password");
    const confirm = screen.getByPlaceholderText("Re-enter password");
    fireEvent.change(pw, { target: { value: "pass1234" } });
    fireEvent.change(confirm, { target: { value: "pass1234" } });
    fireEvent.click(screen.getByText("Lock"));
    await waitFor(() => {
      expect(mockProtectPdf).toHaveBeenCalledWith("p1", "pass1234");
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("calls unlockPdf on valid unlock", async () => {
    mockUnlockPdf.mockResolvedValueOnce({ id: "p1", is_password_protected: false });
    render(<LockUnlockModal {...baseProps} isProtected={true} />);
    const pw = screen.getByPlaceholderText("Enter password");
    fireEvent.change(pw, { target: { value: "pass1234" } });
    fireEvent.click(screen.getByText("Unlock"));
    await waitFor(() => {
      expect(mockUnlockPdf).toHaveBeenCalledWith("p1", "pass1234");
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("shows error on protectPdf failure", async () => {
    mockProtectPdf.mockRejectedValueOnce(new Error("Failed to lock"));
    render(<LockUnlockModal {...baseProps} />);
    const pw = screen.getByPlaceholderText("Enter new password");
    const confirm = screen.getByPlaceholderText("Re-enter password");
    fireEvent.change(pw, { target: { value: "pass1234" } });
    fireEvent.change(confirm, { target: { value: "pass1234" } });
    fireEvent.click(screen.getByText("Lock"));
    await waitFor(() => {
      expect(screen.getByText("Failed to lock")).toBeInTheDocument();
    });
  });

  it("shows error on unlockPdf failure", async () => {
    mockUnlockPdf.mockRejectedValueOnce(new Error("Wrong password"));
    render(<LockUnlockModal {...baseProps} isProtected={true} />);
    const pw = screen.getByPlaceholderText("Enter password");
    fireEvent.change(pw, { target: { value: "wrong" } });
    fireEvent.click(screen.getByText("Unlock"));
    await waitFor(() => {
      expect(screen.getByText("Wrong password")).toBeInTheDocument();
    });
  });

  it("calls onClose when Cancel is clicked", () => {
    render(<LockUnlockModal {...baseProps} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("does not render when open is false", () => {
    const { container } = render(<LockUnlockModal {...baseProps} open={false} />);
    expect(container.innerHTML).toBe("");
  });

  it("toggles password visibility", () => {
    render(<LockUnlockModal {...baseProps} />);
    const pw = screen.getByPlaceholderText("Enter new password");
    expect(pw).toHaveAttribute("type", "password");
    const toggleBtn = document.querySelectorAll('button[tabindex="-1"]');
    fireEvent.click(toggleBtn[0]);
    expect(pw).toHaveAttribute("type", "text");
  });

  it("supports Enter key for lock", () => {
    render(<LockUnlockModal {...baseProps} />);
    const pw = screen.getByPlaceholderText("Enter new password");
    const confirm = screen.getByPlaceholderText("Re-enter password");
    fireEvent.change(pw, { target: { value: "ab" } });
    fireEvent.change(confirm, { target: { value: "ab" } });
    fireEvent.keyDown(pw, { key: "Enter" });
    expect(screen.getByText("Password must be at least 4 characters")).toBeInTheDocument();
  });

  it("supports Enter key for unlock", () => {
    render(<LockUnlockModal {...baseProps} isProtected={true} />);
    const pw = screen.getByPlaceholderText("Enter password");
    fireEvent.keyDown(pw, { key: "Enter" });
    expect(screen.getByText("Password is required")).toBeInTheDocument();
  });
});
