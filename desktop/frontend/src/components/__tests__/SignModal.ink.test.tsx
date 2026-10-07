import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SignModal from "../SignModal";

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));
vi.mock("../../shared/api", () => ({ api: { signPdf: vi.fn() } }));

// Selettore finto che espone l'immagine di anteprima ricevuta.
vi.mock("../PositionSelector", () => ({
  default: ({ signatureImage }: any) => (
    <div data-testid="position-selector" data-preview={signatureImage ?? ""} />
  ),
}));

const strokeStyles: string[] = [];

function mockCanvas() {
  const ctx = {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    set strokeStyle(v: string) { strokeStyles.push(v); },
    set lineWidth(_v: number) { },
    set lineCap(_v: string) { },
  };
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(ctx);
  HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue("data:image/png;base64,c2ln");
  HTMLCanvasElement.prototype.getBoundingClientRect = vi
    .fn()
    .mockReturnValue({ left: 0, top: 0, width: 400, height: 160 });
}

const props = {
  open: true,
  pdfId: "p1",
  pdfName: "test.pdf",
  totalPages: 3,
  onClose: vi.fn(),
  onSaved: vi.fn(),
};

function drawStroke() {
  const canvas = document.querySelector("canvas")!;
  fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
  fireEvent.mouseUp(canvas);
}

describe("SignModal ink color and live preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    strokeStyles.length = 0;
    mockCanvas();
  });

  it("defaults to black ink", () => {
    render(<SignModal {...props} />);
    drawStroke();
    expect(strokeStyles[strokeStyles.length - 1]).toBe("#000000");
  });

  it("draws with the selected ink color", () => {
    render(<SignModal {...props} />);
    fireEvent.click(screen.getByTestId("sign-color-#1565C0"));
    drawStroke();
    expect(strokeStyles[strokeStyles.length - 1]).toBe("#1565C0");
  });

  it("passes the drawn signature to the position selector as live preview", () => {
    render(<SignModal {...props} />);
    drawStroke();
    fireEvent.click(screen.getByTestId("signature-next"));
    expect(screen.getByTestId("position-selector").getAttribute("data-preview")).toBe(
      "data:image/png;base64,c2ln",
    );
  });
});
