import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import AnnotationDialog from "../AnnotationDialog";

// Traduttore finto: risolve solo le chiavi note, il resto resta grezzo.
const messages: Record<string, string> = {
    failed: "Impossibile aggiungere l'annotazione",
    "common.validationError": "Dati di input non validi",
    save: "Salva",
};
vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => messages[key] ?? key,
}));

const mockAddAnnotation = vi.fn();
vi.mock("../../shared/api", () => ({
    api: { addAnnotation: (...args: any[]) => mockAddAnnotation(...args) },
}));

vi.mock("../PositionSelector", () => ({ default: () => <div /> }));

describe("AnnotationDialog error", () => {
    beforeEach(() => vi.clearAllMocks());

    it("shows a translated message, never the raw i18n key", async () => {
        mockAddAnnotation.mockRejectedValue(
            new Error(JSON.stringify({ code: "VALIDATION_ERROR", detail: "bad rect" })),
        );
        render(<AnnotationDialog open onClose={() => { }} pdfId="p1" currentPage={1} />);
        fireEvent.click(screen.getByText("Salva"));

        await waitFor(() =>
            expect(
                screen.getByText("Impossibile aggiungere l'annotazione: Dati di input non validi"),
            ).toBeInTheDocument(),
        );
        expect(screen.queryByText(/common\.validationError/)).toBeNull();
    });
});
