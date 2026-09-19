import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import ShareViewer from "../ShareViewer";

// Mock next-intl
vi.mock("next-intl", () => {
    const t = (key: string) => key;
    return { useTranslations: () => t };
});

describe("ShareViewer", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("shows loading state initially", () => {
        vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => { })));
        render(<ShareViewer token="testtoken" />);
        expect(screen.getByTestId("share-loading")).toBeInTheDocument();
    });

    it("loads public PDF info and shows viewer", async () => {
        vi.stubGlobal("fetch", vi.fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ token: "testtoken", filename: "doc.pdf", has_password: false, expires_at: null }),
            })
            .mockResolvedValueOnce({
                ok: true,
                blob: async () => new Blob([new Uint8Array([1, 2, 3])], { type: "application/pdf" }),
            }));

        render(<ShareViewer token="testtoken" />);
        expect(await screen.findByTestId("share-pdf-viewer")).toBeInTheDocument();
        expect(screen.getByText("doc.pdf")).toBeInTheDocument();
    });

    it("shows password form for protected PDF", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ token: "testtoken", filename: "doc.pdf", has_password: true, expires_at: null }),
        }));

        render(<ShareViewer token="testtoken" />);
        expect(await screen.findByTestId("share-password-input")).toBeInTheDocument();
    });

    it("unlocks protected PDF with correct password", async () => {
        vi.stubGlobal("fetch", vi.fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ token: "testtoken", filename: "doc.pdf", has_password: true, expires_at: null }),
            })
            .mockResolvedValueOnce({
                ok: true,
                blob: async () => new Blob([new Uint8Array([1, 2, 3])], { type: "application/pdf" }),
            }));

        render(<ShareViewer token="testtoken" />);
        await screen.findByTestId("share-password-input");

        fireEvent.change(screen.getByTestId("share-password-input"), { target: { value: "secret" } });
        fireEvent.submit(screen.getByTestId("share-password-input").closest("form")!);

        expect(await screen.findByTestId("share-pdf-viewer")).toBeInTheDocument();
    });

    it("shows error for invalid token", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
        }));

        render(<ShareViewer token="testtoken" />);
        expect(await screen.findByTestId("share-error")).toBeInTheDocument();
    });

    it("shows wrong password error", async () => {
        vi.stubGlobal("fetch", vi.fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ token: "testtoken", filename: "doc.pdf", has_password: true, expires_at: null }),
            })
            .mockResolvedValueOnce({
                ok: false,
                status: 401,
            }));

        render(<ShareViewer token="testtoken" />);
        await screen.findByTestId("share-password-input");

        fireEvent.change(screen.getByTestId("share-password-input"), { target: { value: "wrong" } });
        fireEvent.submit(screen.getByTestId("share-password-input").closest("form")!);

        expect(await screen.findByTestId("share-error")).toBeInTheDocument();
    });
});