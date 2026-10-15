"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { getApiBaseUrl } from "../shared/tauri";

const API_BASE = getApiBaseUrl();

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
 */
export function ChatAssistant({ apiBase = API_BASE }: { apiBase?: string }) {
    const tc = useTranslations("chat");
    const [open, setOpen] = React.useState(false);
    const [messages, setMessages] = React.useState<Message[]>([
        { role: "assistant", content: tc("welcome") },
    ]);
    const [input, setInput] = React.useState("");
    const [sending, setSending] = React.useState(false);
    const [tasks, setTasks] = React.useState<HudTask[]>([]);
    const taskIdRef = React.useRef(0);
    const bottomRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, tasks, open]);

    async function send() {
        const goal = input.trim();
        if (!goal || sending) return;
        const history = messages
            .filter((m) => m.content && !isControl(m.content))
            .map((m) => ({ role: m.role, content: m.content }));
        setMessages((prev) => [...prev, { role: "user", content: goal }]);
        setInput("");
        setSending(true);
        setTasks([]);
        taskIdRef.current = 0;

        let partial = "";
        let sawDone = false;
        try {
            const res = await fetch(`${apiBase}/mind/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ goal, profile: "user", history }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            if (!res.body) throw new Error("NO_BODY");

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buf = "";
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const events = parseSseChunk(buf);
                for (const ev of events) {
                    if (ev === "[DONE]") { sawDone = true; continue; }
                    if (ev.startsWith("[TASK]")) {
                        taskIdRef.current += 1;
                        const id = String(taskIdRef.current);
                        setTasks((prev) => [...prev, { id, label: ev.slice(6), status: "running" }]);
                        continue;
                    }
                    if (isControl(ev)) continue;
                    partial += ev;
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
                buf = buf.slice(buf.lastIndexOf("\n\n") + 2);
            }
            // Stream concluso senza errore: i task si considerano completati.
            if (sawDone || partial) {
                setTasks((prev) => prev.map((t) => ({ ...t, status: "done" as const })));
            }
        } catch (err) {
            const msg =
                err instanceof Error && err.message === "HTTP 401"
                    ? tc("errorAuth")
                    : err instanceof Error && err.message === "HTTP 422"
                      ? tc("errorValidation")
                      : err instanceof Error && err.message === "NO_BODY"
                        ? tc("errorConnection")
                        : tc("error");
            setMessages((prev) => [...prev, { role: "assistant", content: msg, error: true }]);
        } finally {
            setSending(false);
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
                    className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#f7871f] text-2xl shadow-[0_8px_22px_rgba(247,135,31,0.4)] transition hover:scale-105 hover:bg-[#ff9b37]"
                >
                    🐵
                </button>
            )}

            {/* Pannello chat */}
            {open && (
                <div className="fixed bottom-5 right-5 z-40 flex h-[520px] w-[380px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#221b16] shadow-2xl">
                    <div className="flex items-center justify-between border-b border-white/10 bg-[#1f1914] px-4 py-3">
                        <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f7871f]/20 text-lg">🐵</span>
                            <p className="text-[14px] font-semibold text-white">{tc("title")}</p>
                        </div>
                        <button onClick={() => setOpen(false)} className="cursor-pointer rounded-lg px-2 text-[#9d9184] transition hover:bg-white/5 hover:text-white">
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
                        {sending && (
                            <div className="mb-3 flex justify-start">
                                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-[#9d9184]">
                                    {tc("thinking")}
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    <div className="border-t border-white/10 p-3">
                        <div className="flex items-center gap-2">
                            <input
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
                    </div>
                </div>
            )}
        </>
    );
}
