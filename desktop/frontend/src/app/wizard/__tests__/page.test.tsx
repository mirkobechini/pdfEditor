import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import WizardPage from "../page";

const mockPush = vi.fn();
const mockUpdatePrefs = vi.fn();

let mockPrefs: any = { language: "it", default_save_folder: "" };

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush }),
}));

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => {
        const map: Record<string, string> = {
            title: "Benvenuto",
            workFolder: "Cartella di lavoro",
            step01: "Passo 1",
            step02: "Passo 2",
            welcomeTitle: "Benvenuto in PdfEditor",
            welcomeDesc: "Configura il tuo workspace",
            acceptTerms: "Accetto i termini",
            licenseTerms: "Termini di licenza",
            privacyPolicy: "Privacy Policy",
            workFolderDesc: "Scegli la cartella",
            folderPath: "Percorso",
            folderPlaceholder: "Seleziona cartella",
            browse: "Sfoglia",
            fileIndexing: "Indicizzazione",
            fileIndexingDesc: "Indicizza i file",
            skip: "Salta",
            back: "Indietro",
            continue: "Continua",
            finish: "Fine",
            setupProgress: "Progresso {current}/{total}",
        };
        return map[key] || key;
    },
}));

vi.mock("../../../shared/tauri", () => ({
    isTauri: () => false,
    tauriInvoke: vi.fn(),
}));

vi.mock("../../../lib/preferences", () => ({
    usePreferences: () => ({
        prefs: mockPrefs,
        updatePrefs: (...args: any[]) => mockUpdatePrefs(...args),
    }),
    PreferencesProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function renderWithProviders(ui: React.ReactElement) {
    return render(ui);
}

describe("WizardPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPrefs = { language: "it", default_save_folder: "" };
        localStorage.clear();
        // Mock window.__TAURI__ for openExternal and pickDirectory
        (window as any).__TAURI__ = {
            opener: { openUrl: vi.fn().mockResolvedValue(undefined) },
            dialog: { open: vi.fn().mockResolvedValue("/selected/folder") },
        };
    });

    afterEach(() => {
        delete (window as any).__TAURI__;
    });

    it("renders welcome step by default", () => {
        render(<WizardPage />);
        expect(screen.getByText("Benvenuto in PdfEditor")).toBeInTheDocument();
        expect(screen.getByText("Passo 1")).toBeInTheDocument();
    });

    it("renders step indicators", () => {
        render(<WizardPage />);
        expect(screen.getByText("01")).toBeInTheDocument();
        expect(screen.getByText("02")).toBeInTheDocument();
    });

    it("renders progress text", () => {
        render(<WizardPage />);
        expect(screen.getByText(/Progresso/)).toBeInTheDocument();
    });

    it("renders skip button", () => {
        render(<WizardPage />);
        expect(screen.getByText("Salta")).toBeInTheDocument();
    });

    it("renders continue button disabled when terms not accepted", () => {
        render(<WizardPage />);
        const continueBtn = screen.getByText("Continua");
        expect(continueBtn).toBeDisabled();
    });

    it("enables continue button after accepting terms", () => {
        render(<WizardPage />);
        const checkbox = screen.getByRole("checkbox");
        fireEvent.click(checkbox);
        expect(screen.getByText("Continua")).not.toBeDisabled();
    });

    it("navigates to step 2 on continue", () => {
        render(<WizardPage />);
        const checkbox = screen.getByRole("checkbox");
        fireEvent.click(checkbox);
        fireEvent.click(screen.getByText("Continua"));
        expect(screen.getByText("Passo 2")).toBeInTheDocument();
        expect(screen.getByText("Scegli la cartella")).toBeInTheDocument();
    });

    it("shows back button on step 2", () => {
        render(<WizardPage />);
        const checkbox = screen.getByRole("checkbox");
        fireEvent.click(checkbox);
        fireEvent.click(screen.getByText("Continua"));
        expect(screen.getByText("Indietro")).toBeInTheDocument();
    });

    it("navigates back to step 1", () => {
        render(<WizardPage />);
        const checkbox = screen.getByRole("checkbox");
        fireEvent.click(checkbox);
        fireEvent.click(screen.getByText("Continua"));
        fireEvent.click(screen.getByText("Indietro"));
        expect(screen.getByText("Benvenuto in PdfEditor")).toBeInTheDocument();
    });

    it("shows finish button on step 2", () => {
        render(<WizardPage />);
        const checkbox = screen.getByRole("checkbox");
        fireEvent.click(checkbox);
        fireEvent.click(screen.getByText("Continua"));
        expect(screen.getByText("Fine")).toBeInTheDocument();
    });

    it("calls router.push on finish", () => {
        render(<WizardPage />);
        const checkbox = screen.getByRole("checkbox");
        fireEvent.click(checkbox);
        fireEvent.click(screen.getByText("Continua"));
        fireEvent.click(screen.getByText("Fine"));
        // Finish must mark wizard as done and go to /login (not /app)
        expect(localStorage.getItem("pdfeditor_wizard_done")).toBe("true");
        expect(mockPush).toHaveBeenCalledWith("/login");
    });

    it("saves work folder on finish", () => {
        render(<WizardPage />);
        const checkbox = screen.getByRole("checkbox");
        fireEvent.click(checkbox);
        fireEvent.click(screen.getByText("Continua"));
        const folderInput = screen.getByPlaceholderText("Seleziona cartella");
        fireEvent.change(folderInput, { target: { value: "/home/docs" } });
        fireEvent.click(screen.getByText("Fine"));
        expect(mockUpdatePrefs).toHaveBeenCalledWith({ default_save_folder: "/home/docs" });
    });

    it("calls router.push on skip", () => {
        render(<WizardPage />);
        fireEvent.click(screen.getByText("Salta"));
        expect(localStorage.getItem("pdfeditor_wizard_done")).toBe("true");
        expect(mockPush).toHaveBeenCalledWith("/login");
    });

    it("shows completed step indicator after step 1", () => {
        render(<WizardPage />);
        const checkbox = screen.getByRole("checkbox");
        fireEvent.click(checkbox);
        fireEvent.click(screen.getByText("Continua"));
        expect(screen.getByText("✓")).toBeInTheDocument();
    });

    it("renders browse button on step 2", () => {
        render(<WizardPage />);
        const checkbox = screen.getByRole("checkbox");
        fireEvent.click(checkbox);
        fireEvent.click(screen.getByText("Continua"));
        expect(screen.getByText("Sfoglia")).toBeInTheDocument();
    });

    it("renders file indexing toggle on step 2", () => {
        render(<WizardPage />);
        const checkbox = screen.getByRole("checkbox");
        fireEvent.click(checkbox);
        fireEvent.click(screen.getByText("Continua"));
        expect(screen.getByText("Indicizzazione")).toBeInTheDocument();
    });

    it("renders terms and privacy links", () => {
        render(<WizardPage />);
        expect(screen.getByText("Termini di licenza")).toBeInTheDocument();
        expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
    });

    it("shows progress 2/2 on step 2", () => {
        render(<WizardPage />);
        const checkbox = screen.getByRole("checkbox");
        fireEvent.click(checkbox);
        fireEvent.click(screen.getByText("Continua"));
        expect(screen.getByText(/Progresso/)).toBeInTheDocument();
    });

    it("opens terms link via __TAURI__ opener", () => {
        render(<WizardPage />);
        fireEvent.click(screen.getByText("Termini di licenza"));
        expect((window as any).__TAURI__.opener.openUrl).toHaveBeenCalledWith(
            "https://pdfeditor.mirkobechini.com/terms",
        );
    });

    it("opens privacy link via __TAURI__ opener", () => {
        render(<WizardPage />);
        fireEvent.click(screen.getByText("Privacy Policy"));
        expect((window as any).__TAURI__.opener.openUrl).toHaveBeenCalledWith(
            "https://www.iubenda.com/privacy-policy/76778813",
        );
    });

    it("browse button calls pickDirectory and sets folder", async () => {
        render(<WizardPage />);
        const checkbox = screen.getByRole("checkbox");
        fireEvent.click(checkbox);
        fireEvent.click(screen.getByText("Continua"));
        fireEvent.click(screen.getByText("Sfoglia"));
        await waitFor(() => {
            const input = screen.getByPlaceholderText("Seleziona cartella") as HTMLInputElement;
            expect(input.value).toBe("/selected/folder");
        });
    });
});
