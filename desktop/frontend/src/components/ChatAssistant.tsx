"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { getApiBaseUrl } from "../shared/tauri";
import { api } from "../shared/api";
import { useAuth } from "../shared/auth";
import { useRouter } from "next/navigation";

const API_BASE = getApiBaseUrl();
// Cronologia locale (16/10): i messaggi resistono alla chiusura/riapertura del pallino.
const HISTORY_KEY = "pdfeditor_chat_history";

function loadHistory(): Message[] {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        return Array.isArray(arr)
            ? arr.filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
            : [];
    } catch {
        return [];
    }
}

function saveHistory(messages: Message[]) {
    try {
        const keep = messages.filter((m) => m.content && !m.error);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(keep.slice(-40)));
    } catch {
        /* non critico */
    }
}

type Message = { role: "user" | "assistant"; content: string; error?: boolean };

type HudTask = { id: string; label: string; status: "pending" | "running" | "done" };

/** Parsing dello stream SSE del motore /mind/chat. */
function parseSseChunk(buf: string): string[] {
    const lines = buf.split("\n");
    const out: string[] = [];
    for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data) continue;
        let text: string;
        try {
            text = JSON.parse(data);
        } catch {
            text = data;
        }
        if (typeof text === "string" && text) out.push(text);
    }
    return out;
}

/** Isola i marcatori del motore ([TASK], [STEP], [HITL], [DONE], [THREAD]). */
function isControl(text: string): boolean {
    return /^\[(TASK|STEP|HITL|DONE|THREAD)\]/.test(text);
}

/**
 * Chat Assistant (T4a): pallino flottante in basso a destra (stile chatbot web)
 * che apre un pannello chat collegato al motore /mind/chat (streaming SSE).
 *
 * Punto 6 (Mirko 15/10): se il Deep Agent non è configuraato, guida l'utente
 * verso la configurazione invece di lasciarlo scrivere in chat.
 */
export function ChatAssistant({ apiBase = API_BASE }: { apiBase?: string }) {
    const tc = useTranslations("chat");
    const router = useRouter();
    const { user } = useAuth();
    const [open, setOpen] = React.useState(false);
    const [messages, setMessages] = React.useState<Message[]>(() => {
        const hist = loadHistory();
        return hist.length ? hist : [{ role: "assistant", content: tc("welcome") }];
    });
    const [input, setInput] = React.useState("");
    const [sending, setSending] = React.useState(false);
    const [tasks, setTasks] = React.useState<HudTask[]>([]);
    const [activeTool, setActiveTool] = React.useState<string | null>(null); // STEP corrente
    const taskIdRef = React.useRef(0);
    const bottomRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    // Punto 5 + HITL nativo: il thread_id arriva dall'evento [THREAD] e viene
    // riusato per la ripresa /approve; `hitl` tiene la conferma in sospeso.
    const [threadId, setThreadId] = React.useState<string | null>(null);
    const [hitl, setHitl] = React.useState<{ tool: string; threadId: string } | null>(null);

    // Persisti la cronologia locale quando cambia (non salvare i messaggi di errore
    // né i controlli; teniamo solo testo utile, max 40).
    React.useEffect(() => {
        if (!messages.some((m) => m.content)) return;
        saveHistory(messages);
    }, [messages]);

    // Config Deep Agent: se non configurato (provider non valido / nessuna key
    // per un provider cloud), mostriamo l'invito alla config al posto dell'input.
    const [configReady, setConfigReady] = React.useState<boolean | null>(null); // null = checking

    React.useEffect(() => {
        if (!open) return;
        let cancelled = false;
        api.getMindConfig()
            .then((cfg) => {
                if (cancelled) return;
                // Config pronta se: ollama (locale, senza key) oppure un provider
                // cloud con has_api_key true.
                const ready = cfg.provider === "ollama" || (cfg.provider !== "" && cfg.has_api_key);
                setConfigReady(ready);
            })
            .catch(() => { if (!cancelled) setConfigReady(false); });
        return () => { cancelled = true; };
    }, [open]);

    // Focus sull'input appena si apre il pallino (16/10).
    React.useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 120);
    }, [open]);

    React.useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, tasks, open]);

    // QA #18.b (tutti e 6, 19/10): costruisce una history COMPRESSA e PULITA.
    // #3 esclude le azioni già eseguite (non le ripassa come comandi),
    // #4 comprime il contesto vecchio in una riga di riassunto invece di tagliare a caso,
    // #6 appiattisce i dettagli tecnici degli strumenti.
    function buildHistory(src: Message[]): { role: string; content: string }[] {
        const MAX = 12;
        const cleaned = src.filter((m) => m.content && !isControl(m.content) && !m.error);
        const isEsito = /^(✓|✅|❌|Errore:|Errore\.)/;
        const past: { role: string; content: string }[] = [];
        for (const m of cleaned) {
            if (m.role === "assistant" && isEsito.test(m.content.trim())) {
                // #3: azione già conclusa -> non passarla come comando da rieseguire
                past.push({ role: "assistant", content: `(precedente: ${m.content.trim()})` });
            } else {
                past.push({ role: m.role, content: m.content });
            }
        }
        if (past.length <= MAX) return past;
        // #4: compressione del contesto vecchio (riassunto) invece del taglio netto
        const recent = past.slice(-MAX);
        const old = past.slice(0, -MAX);
        const summary = old.map((m) => m.content).join(" · ").slice(0, 800);
        return [{ role: "assistant", content: `Contesto precedente: ${summary}` }, ...recent];
    }

    /** Appende testo all'ultimo messaggio assistant (creandolo se assente). */
    function appendAssistantText(ev: string) {
        setMessages((prev) => {
            const next = [...prev];
            if (next[next.length - 1]?.role === "assistant") {
                next[next.length - 1] = { role: "assistant", content: next[next.length - 1].content + ev };
            } else {
                next.push({ role: "assistant", content: ev });
            }
            return next;
        });
    }

    /**
     * Consuma uno stream SSE /mind/chat o /mind/approve, gestendo i marcatori
     * del motore ([THREAD], [TASK], [STEP], [HITL], [DONE]) e il testo.
     * Ritorna quando lo stream termina (dopo [DONE] o dopo un [HITL]).
     */
    async function consumeStream(res: Response): Promise<{ done: boolean; hitlTool: string | null; sawText: boolean; threadId: string | null }> {
        let done = false;
        let hitlTool: string | null = null;
        let sawText = false;
        let seenThread: string | null = null;
        if (!res.body) return { done, hitlTool, sawText, threadId: seenThread };
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const { done: d, value } = await reader.read();
            if (d) break;
            buf += decoder.decode(value, { stream: true });
            const events = parseSseChunk(buf);
            for (const ev of events) {
                if (ev === "[DONE]") { done = true; continue; }
                if (ev.startsWith("[THREAD]")) {
                    // [THREAD] è lungo 8 caratteri: slice(8) toglie il marker e resta solo l'id
                    const t = ev.slice(8).trim();
                    seenThread = t || null;
                    setThreadId(seenThread);
                    continue;
                }
                if (ev.startsWith("[TASK]")) {
                    taskIdRef.current += 1;
                    const id = String(taskIdRef.current);
                    setTasks((prev) => [...prev, { id, label: ev.slice(6), status: "running" as const }]);
                    continue;
                }
                if (ev.startsWith("[STEP]")) { setActiveTool(ev.slice(6)); continue; }
                if (ev.startsWith("[HITL]")) { hitlTool = ev.slice(6).trim(); continue; }
                if (isControl(ev)) continue;
                sawText = true;
                appendAssistantText(ev);
                setActiveTool(null); // testo in arrivo => tool concluso
            }
            buf = buf.slice(buf.lastIndexOf("\n\n") + 2);
        }
        return { done, hitlTool, sawText, threadId: seenThread };
    }

    async function send() {
        const goal = input.trim();
        if (!goal || sending) return;
        const history = buildHistory(messages);
        setMessages((prev) => [...prev, { role: "user", content: goal }]);
        setInput("");
        setSending(true);
        setHitl(null);
        setTasks([]);
        setActiveTool(null);
        taskIdRef.current = 0;
        try {
            // Fix 16/10: passa l'utente della sessione così i tool (merge/split/...)
            // operano sull'utente reale, non su env/admin di default.
            const res = await fetch(`${apiBase}/mind/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ goal, profile: "user", history, user_id: user?.id }),
            });
            if (!res.ok) {
                const detail = await res.text().catch(() => "");
                throw new Error(`HTTP ${res.status}${detail ? `::${detail}` : ""}`);
            }
            const { done, hitlTool, sawText, threadId: seenThread } = await consumeStream(res);
            // HITL nativo: l'agente si è fermato e attende conferma (Procedi/Annulla).
            // Il thread_id arriva dall'evento [THREAD] (seenThread) e viene riusato da /approve.
            if (hitlTool) {
                setHitl({ tool: hitlTool, threadId: seenThread ?? threadId ?? "" });
                return;
            }
            if (done || sawText) {
                setTasks((prev) => prev.map((t) => ({ ...t, status: "done" as const })));
            } else {
                // Stream chiuso senza output e senza [DONE]: esito esplicito.
                setMessages((prev) => [...prev, { role: "assistant", content: tc("emptyReply"), error: true }]);
            }
        } catch (err) {
            const raw = err instanceof Error ? err.message : "";
            const msg =
                raw.includes("HTTP 401") ? tc("errorAuth")
                    : raw.includes("HTTP 422") ? tc("errorValidation")
                        : err instanceof Error && err.message === "NO_BODY" ? tc("errorConnection")
                            : raw.includes("::") ? raw.split("::").slice(1).join("::").slice(0, 400)
                                : tc("error");
            setMessages((prev) => [...prev, { role: "assistant", content: msg, error: true }]);
        } finally {
            setSending(false);
            setActiveTool(null);
            setTimeout(() => setTasks([]), 1200);
        }
    }

    /** Riprende uno stream HITL interrotto: POST /mind/approve {thread_id, approve}. */
    async function approve(decision: boolean) {
        if (!hitl) return;
        const cur = hitl;
        setHitl(null);
        setSending(true);
        setActiveTool(null);
        try {
            const res = await fetch(`${apiBase}/mind/approve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ thread_id: cur.threadId, approve: decision }),
            });
            if (!res.ok) {
                const detail = await res.text().catch(() => "");
                throw new Error(`HTTP ${res.status}${detail ? `::${detail}` : ""}`);
            }
            const { done, hitlTool } = await consumeStream(res);
            if (hitlTool) {
                // Altro passaggio da confermare (es. più tool): mostriamo di nuovo i pulsanti.
                setHitl({ tool: hitlTool, threadId: cur.threadId });
                return;
            }
            if (done) setTasks((prev) => prev.map((t) => ({ ...t, status: "done" as const })));
        } catch (err) {
            const raw = err instanceof Error ? err.message : "";
            const msg = raw.includes("::") ? raw.split("::").slice(1).join("::").slice(0, 400) : tc("error");
            setMessages((prev) => [...prev, { role: "assistant", content: msg, error: true }]);
        } finally {
            setSending(false);
            setActiveTool(null);
            setTimeout(() => setTasks([]), 1200);
        }
    }

    return (
        <>
            {/* Pallino flottante */}
            {!open && (
                <button
                    onClick={() => setOpen(true)}
                    aria-label="Chat assistente AI"
                    className="fixed bottom-20 right-8 z-40 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-[#f7871f] text-2xl shadow-[0_8px_22px_rgba(247,135,31,0.4)] transition hover:scale-105 hover:bg-[#ff9b37]"
                >
                    🐵
                </button>
            )}

            {/* Pannello chat */}
            {open && (
                <div className="fixed bottom-20 right-8 z-40 flex h-[520px] w-[380px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#221b16] shadow-2xl">
                    <div className="flex items-center justify-between border-b border-white/10 bg-[#1f1914] px-4 py-3">
                        <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f7871f]/20 text-lg">🐵</span>
                            <p className="text-[14px] font-semibold text-white">{tc("title")}</p>
                        </div>
                        <button onClick={() => setOpen(false)} aria-label="Chiudi chat" className="cursor-pointer rounded-lg px-2 text-[#9d9184] transition hover:bg-white/5 hover:text-white">
                            ✕
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-4">
                        {messages.map((m, i) => {
                            if (isControl(m.content)) return null;
                            return (
                                <div key={i} className={`mb-3 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                    <div
                                        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
                                            m.role === "user"
                                                ? "bg-[#f7871f] text-white"
                                                : m.error
                                                  ? "border border-red-500/30 bg-red-500/10 text-red-300"
                                                  : "border border-white/10 bg-white/[0.04] text-[#f4f1ee]"
                                        }`}
                                    >
                                        {m.content}
                                    </div>
                                </div>
                            );
                        })}
                        {tasks.length > 0 && (
                            <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#f7871f]">{tc("task")}</p>
                                {tasks.map((t) => (
                                    <p key={t.id} className="flex items-center gap-2 py-0.5 text-[12px] text-[#c4b9ad]">
                                        {t.status === "done" ? (
                                            <span className="text-[#48c769]">✓</span>
                                        ) : (
                                            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#f7871f]/30 border-t-[#f7871f]" style={{ verticalAlign: "middle" }} />
                                        )}
                                        {t.label}
                                    </p>
                                ))}
                            </div>
                        )}
                        {activeTool && (
                            <div className="mb-3 flex items-center gap-2 rounded-xl border border-[#f7871f]/25 bg-[#f7871f]/[0.06] px-3 py-2 text-[12px] text-[#f7871f]">
                                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#f7871f]/30 border-t-[#f7871f]" />
                                <span className="font-medium">{tc("toolActivity", { tool: activeTool })}</span>
                            </div>
                        )}
                        {sending && !activeTool && (
                            <div className="mb-3 flex justify-start">
                                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-[#9d9184]">
                                    {tc("thinking")}
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    <div className="border-t border-white/10 p-3">
                        {hitl ? (
                            /* HITL nativo: l'agente attende la conferma (Procedi/Annulla). */
                            <div className="rounded-xl border border-[#f7871f]/30 bg-[#f7871f]/[0.06] px-3 py-3">
                                <p className="mb-2 text-[13px] font-semibold text-white">{tc("hitlTitle", { tool: hitl.tool })}</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => approve(true)}
                                        disabled={sending}
                                        className="cursor-pointer rounded-xl bg-[#48c769] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#5bd87c] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {tc("hitlApprove")}
                                    </button>
                                    <button
                                        onClick={() => approve(false)}
                                        disabled={sending}
                                        className="cursor-pointer rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-[13px] font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {tc("hitlReject")}
                                    </button>
                                </div>
                            </div>
                        ) : configReady === false ? (
                            /* Punto 6: non configurato → guida alla configurazione. */
                            <div className="rounded-xl border border-white/10 bg-[#1b1612] px-4 py-3 text-center">
                                <p className="text-[13px] font-semibold text-white">{tc("notConfiguredTitle")}</p>
                                <p className="mt-1 text-[12px] text-[#9d9184]">{tc("notConfiguredDesc")}</p>
                                <button
                                    onClick={() => {
                                        setOpen(false);
                                        router.push("/settings");
                                    }}
                                    className="mt-3 cursor-pointer rounded-xl bg-[#f7871f] px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-[#ff9b37]"
                                >
                                    {tc("goToSettings")}
                                </button>
                            </div>
                        ) : configReady === true ? (
                            <div className="flex items-center gap-2">
                                <input
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                                    placeholder={tc("placeholder")}
                                    className="flex-1 rounded-xl border border-white/10 bg-[#1b1612] px-3 py-2 text-[13px] text-white outline-none focus:border-[#f7871f]"
                                />
                                <button
                                    onClick={send}
                                    disabled={sending || !input.trim()}
                                    className="cursor-pointer rounded-xl bg-[#f7871f] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#ff9b37] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {tc("send")}
                                </button>
                            </div>
                        ) : (
                            <p className="text-center text-[12px] text-[#9d9184]">{tc("checking")}</p>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
