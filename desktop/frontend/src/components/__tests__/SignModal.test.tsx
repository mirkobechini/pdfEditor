import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SignModal from "../SignModal";

const mockOnClose = vi.fn();
const mockOnSaved = vi.fn();
const mockSignPdf = vi.fn();

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));

const baseProps = {
  open: true,
  pdfId: "p1",
  pdfName: "test.pdf",
  totalPages: 3,
  onClose: mockOnClose,
  onSaved: mockOnSaved,
};

vi.mock("../../shared/api", () => ({
  api: {
    signPdf: (...args: any[]) => mockSignPdf(...args),
  },
}));

// Mock canvas context so drawing works in jsdom
function mockCanvas() {
  const ctx = {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    set strokeStyle(v: string) { },
    set lineWidth(v: number) { },
    set lineCap(v: string) { },
  };
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(ctx);
  HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue("data:image/png;base64,c2ln");
  HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn().mockReturnValue({ left: 0, top: 0, width: 400, height: 160 });
  return ctx;
}

describe("SignModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanvas();
  });

  it("renders nothing when closed", () => {
    const { container } = render(<SignModal {...baseProps} open={false} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders form when open", () => {
    render(<SignModal {...baseProps} />);
    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("drawLabel")).toBeInTheDocument();
  });

  it("shows error when no signature drawn", async () => {
    render(<SignModal {...baseProps} />);
    fireEvent.click(screen.getByText("sign"));
    expect(await screen.findByText("noSignature")).toBeInTheDocument();
  });

  it("calls signPdf when signature drawn", async () => {
    mockSignPdf.mockResolvedValue({ id: "p1", original_filename: "test.pdf" });
    render(<SignModal {...baseProps} />);

    const canvas = document.querySelector("canvas")!;
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(canvas, { clientX: 50, clientY: 50 });
    fireEvent.mouseUp(canvas);

    fireEvent.click(screen.getByText("sign"));
    await waitFor(() => {
      expect(mockSignPdf).toHaveBeenCalledWith("p1", "c2ln", 1, 50, 50, 200, 80);
    });
  });

  it("calls onClose after successful sign", async () => {
    mockSignPdf.mockResolvedValue({ id: "p1", original_filename: "test.pdf" });
    render(<SignModal {...baseProps} />);

    const canvas = document.querySelector("canvas")!;
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseUp(canvas);

    fireEvent.click(screen.getByText("sign"));
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("shows error when signPdf fails", async () => {
    mockSignPdf.mockRejectedValue(new Error("boom"));
    render(<SignModal {...baseProps} />);

    const canvas = document.querySelector("canvas")!;
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseUp(canvas);

    fireEvent.click(screen.getByText("sign"));
    expect(await screen.findByText(/signFailed/)).toBeInTheDocument();
  });

  it("clears canvas when clear button clicked", () => {
    render(<SignModal {...baseProps} />);
    fireEvent.click(screen.getByText("clear"));
    const ctx = HTMLCanvasElement.prototype.getContext as any;
    expect(ctx).toHaveBeenCalled();
  });

  it("loads uploaded image onto canvas", async () => {
    render(<SignModal {...baseProps} />);

    // Mock FileReader as a class so `new FileReader()` works
    class MockFileReader {
      result = "data:image/png;base64,aW1n";
      onload: (() => void) | null = null;
      readAsDataURL() {
        this.onload?.();
      }
    }
    vi.stubGlobal("FileReader", MockFileReader);

    // Mock Image so onload fires when src is set
    class MockImage {
      onload: (() => void) | null = null;
      set src(_v: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    }
    vi.stubGlobal("Image", MockImage);

    const file = new File(["img"], "sig.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]')!;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const ctx = HTMLCanvasElement.prototype.getContext as any;
      expect(ctx).toHaveBeenCalled();
    });

    vi.unstubAllGlobals();
  });
});