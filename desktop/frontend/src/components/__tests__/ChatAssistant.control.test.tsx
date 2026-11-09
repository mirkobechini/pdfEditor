/**
 * 09/11 (Mirko punto 2): il modello in uso arriva come evento [MODEL] e NON deve
 * mai comparire come testo della chat. Questi test bloccano la regressione.
 */
import { describe, expect, it } from "vitest";
import { isControl, parseSseChunk } from "../ChatAssistant";

describe("ChatAssistant — marcatori del motore", () => {
    it("considera [MODEL] un marcatore di controllo (non testo utente)", () => {
        expect(isControl("[MODEL] openrouter:google/gemini-flash")).toBe(true);
    });

    it("continua a riconoscere gli altri marcatori", () => {
        expect(isControl("[THREAD] abc")).toBe(true);
        expect(isControl("[TASK] lettura")).toBe(true);
        expect(isControl("[STEP] merge_pdf")).toBe(true);
        expect(isControl("[HITL] merge_pdf||confermi?")).toBe(true);
        expect(isControl("[DONE]")).toBe(true);
    });

    it("non tratta come controllo una risposta normale", () => {
        expect(isControl("Fatto: ho unito i file")).toBe(false);
    });

    it("estrae l'evento [MODEL] dallo stream SSE", () => {
        const evs = parseSseChunk('data: "[THREAD] t1"\n\ndata: "[MODEL] ollama:qwen3.5:9b"\n\n');
        expect(evs).toContain("[THREAD] t1");
        expect(evs).toContain("[MODEL] ollama:qwen3.5:9b");
    });
});
