import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LockUnlockModal from "../LockUnlockModal";

const mockOnClose = vi.fn();
const mockOnSaved = vi.fn();

const baseProps = {
  open: true,
  pdfId: "p1",
  pdfName: "test.pdf",
  isProtected: false,
  onClose: mockOnClose,
  onSaved: mockOnSaved,
};

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

  it("calls onClose when Cancel is clicked", () => {
    render(<LockUnlockModal {...baseProps} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("does not render when open is false", () => {
    const { container } = render(<LockUnlockModal {...baseProps} open={false} />);
    expect(container.innerHTML).toBe("");
  });
});
