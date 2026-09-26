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

vi.mock("../PositionSelector", () => ({
  default: ({ onPositionChange }: any) => (
    <div data-testid="position-selector">
      <button onClick={() => onPositionChange(120, 80)}>set-pos</button>
    </div>
  ),
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
    // Next is disabled without a signature — clicking it does nothing
    const nextBtn = screen.getByTestId("signature-next");
    expect(nextBtn).toBeDisabled();
    fireEvent.click(nextBtn);
    expect(screen.queryByText("noSignature")).not.toBeInTheDocument();
  });

  it("calls signPdf when signature drawn", async () => {
    mockSignPdf.mockResolvedValue({ id: "p1", original_filename: "test.pdf" });
    render(<SignModal {...baseProps} />);

    const canvas = document.querySelector("canvas")!;
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(canvas, { clientX: 50, clientY: 50 });
    fireEvent.mouseUp(canvas);

    fireEvent.click(screen.getByTestId("signature-next"));
    fireEvent.click(screen.getByTestId("signature-sign"));
    await waitFor(() => {
      expect(mockSignPdf).toHaveBeenCalledWith("p1", "c2ln", 1, 50, 50, 200, 80);
    });
  });

  it("uses position selected via PositionSelector", async () => {
    mockSignPdf.mockResolvedValue({ id: "p1", original_filename: "test.pdf" });
    render(<SignModal {...baseProps} />);

    const canvas = document.querySelector("canvas")!;
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseUp(canvas);

    // Move the position box to (120, 80)
    fireEvent.click(screen.getByTestId("signature-next"));
    fireEvent.click(screen.getByText("set-pos"));

    fireEvent.click(screen.getByTestId("signature-sign"));
    await waitFor(() => {
      expect(mockSignPdf).toHaveBeenCalledWith("p1", "c2ln", 1, 120, 80, 200, 80);
    });
  });

  it("calls onClose after successful sign", async () => {
    mockSignPdf.mockResolvedValue({ id: "p1", original_filename: "test.pdf" });
    render(<SignModal {...baseProps} />);

    const canvas = document.querySelector("canvas")!;
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseUp(canvas);

    fireEvent.click(screen.getByTestId("signature-next"));
    fireEvent.click(screen.getByTestId("signature-sign"));
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

    fireEvent.click(screen.getByTestId("signature-next"));
    fireEvent.click(screen.getByTestId("signature-sign"));
    expect(await screen.findByText(/signFailed/)).toBeInTheDocument();
  });

  it("clears canvas when clear button clicked", () => {
    render(<SignModal {...baseProps} />);
    fireEvent.click(screen.getByText("clear"));
    const ctx = HTMLCanvasElement.prototype.getContext as any;
    expect(ctx).toHaveBeenCalled();
  });

  it("undo restores previous canvas state", async () => {
    render(<SignModal {...baseProps} />);
    const canvas = document.querySelector("canvas")!;
    // Draw once
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseUp(canvas);

    const undoBtn = screen.getByTestId("signature-undo");
    // Undo should be enabled after drawing
    expect(undoBtn).not.toBeDisabled();
    const toDataURL = HTMLCanvasElement.prototype.toDataURL as any;
    toDataURL.mockClear();
    fireEvent.click(undoBtn);

    // After undo, the canvas should be redrawn from the snapshot
    const ctx = HTMLCanvasElement.prototype.getContext as any;
    expect(ctx).toHaveBeenCalled();
    // The restored state must be persisted to signatureDataUrl so the final
    // signature reflects the undo (not the scribble that was undone).
    expect(toDataURL).toHaveBeenCalled();
  });

  it("redo restores state after undo", async () => {
    render(<SignModal {...baseProps} />);
    const canvas = document.querySelector("canvas")!;
    // Draw once to have a redo-able state
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseUp(canvas);

    const undoBtn = screen.getByTestId("signature-undo");
    expect(undoBtn).not.toBeDisabled();
    const toDataURL = HTMLCanvasElement.prototype.toDataURL as any;
    toDataURL.mockClear();
    fireEvent.click(undoBtn);
    // undo() calls toDataURL to push current state to redo stack
    expect(toDataURL).toHaveBeenCalled();

    const redoBtn = screen.getByTestId("signature-redo");
    expect(redoBtn).not.toBeDisabled();
    fireEvent.click(redoBtn);

    const ctx = HTMLCanvasElement.prototype.getContext as any;
    expect(ctx).toHaveBeenCalled();
  });

  it("loads uploaded image onto canvas", async () => {
    // Capture the mocked canvas context so we can assert on drawImage.
    let ctx: any;
    const origMock = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(() => {
      ctx = origMock();
      return ctx;
    });

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

    // Mock Image so onload fires when src is set. document.createElement("img")
    // must return this mock so the component's img.onload fires.
    class MockImage {
      onload: (() => void) | null = null;
      naturalWidth = 200;
      naturalHeight = 100;
      set src(_v: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    }
    vi.stubGlobal("Image", MockImage);
    const origCreateElement = document.createElement.bind(document);
    document.createElement = vi.fn((tag: string) => {
      if (tag === "img") return new MockImage();
      return origCreateElement(tag);
    }) as any;

    const file = new File(["img"], "sig.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]')!;
    // jsdom canvases have 0x0 dimensions; set real ones so the aspect-ratio
    // math in handleUpload produces positive draw sizes.
    const canvasEl = document.querySelector("canvas")!;
    canvasEl.setAttribute("width", "400");
    canvasEl.setAttribute("height", "160");
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(ctx).toBeDefined();
      // The uploaded image must be drawn onto the canvas (aspect-ratio
      // preserving logic runs without error).
      expect(ctx.drawImage).toHaveBeenCalled();
    });

    vi.unstubAllGlobals();
  });
});