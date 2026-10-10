import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import CloudDeletionDialog from "../CloudDeletionDialog";

const messages: Record<string, string> = {
    title: "PDF eliminato dal cloud",
    desc: "\"{name}\" non è più sul cloud",
    deleteLocal: "Elimina anche in locale",
    keepLocal: "Tieni solo in locale",
};
vi.mock("next-intl", () => ({
    useTranslations: () => (key: string, vars?: { name?: string }) => {
        let s = messages[key] ?? key;
        if (vars?.name) s = s.replace("{name}", vars.name);
        return s;
    },
}));

const deletion = { localId: "l1", name: "a.pdf", cloudId: "c1" };

describe("CloudDeletionDialog (#990)", () => {
    const onResolve = vi.fn();
    beforeEach(() => vi.clearAllMocks());

    it("non renderizza nulla senza richieste", () => {
        const { container } = render(
            <CloudDeletionDialog deletion={null} onResolve={onResolve} />,
        );
        expect(container).toBeEmptyDOMElement();
    });

    it("mostra il nome del PDF eliminato dal cloud", () => {
        render(<CloudDeletionDialog deletion={deletion} onResolve={onResolve} />);
        expect(screen.getByText(/a\.pdf/)).toBeInTheDocument();
    });

    it("'Elimina anche in locale' risolve con delete", () => {
        render(<CloudDeletionDialog deletion={deletion} onResolve={onResolve} />);
        fireEvent.click(screen.getByTestId("cloud-deletion-delete"));
        expect(onResolve).toHaveBeenCalledWith("l1", "delete");
    });

    it("'Tieni solo in locale' risolve con keep", () => {
        render(<CloudDeletionDialog deletion={deletion} onResolve={onResolve} />);
        fireEvent.click(screen.getByTestId("cloud-deletion-keep"));
        expect(onResolve).toHaveBeenCalledWith("l1", "keep");
    });

    it("'Ricarica sul cloud' risolve con reupload", () => {
        render(<CloudDeletionDialog deletion={deletion} onResolve={onResolve} />);
        fireEvent.click(screen.getByTestId("cloud-deletion-reupload"));
        expect(onResolve).toHaveBeenCalledWith("l1", "reupload");
    });
});
