import json
import os
import uuid

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from langgraph.types import Command
from pydantic import BaseModel

from app.deep_agent.agents.pdfmind import build_agent

app = FastAPI(title="PdfMind")

# Sessione HITL: thread_id -> {"agent", "config"} per riprendere uno stream interrotto
SESSIONS: dict[str, dict] = {}


@app.get("/")
async def index():
    return FileResponse("web/index.html")


@app.get("/favicon.svg")
async def favicon():
    return FileResponse("web/favicon.svg", media_type="image/svg+xml")


@app.get("/config")
async def config():
    return {"profile": os.environ.get("PDFMIND_PROFILE", "user")}


class ChatReq(BaseModel):
    goal: str
    profile: str = "user"
    model: str | None = None
    history: list[dict] = []
    # Fix 19/10: la SIDECAR desktop (questo server su :7723) deve sapere CHI è
    # l'utente autenticato, altrimenti i tool PDF (merge/split/...) falliscono con
    # "Nessun utente risolto... imposta PDFMIND_USER_ID". Il frontend lo invia.
    user_id: str | None = None


def _text(chunk) -> str:
    """Ritorna il testo dell'ultimo messaggio, ma NON i ToolMessage.

    Fix 19/10 (Problema 1, Mirko): per i tool di LETTURA (es. elenca_workspace)
    l'esito era emesso due volte — il ToolMessage grezzo qui e poi il riassunto
    dell'LLM in un chunk successivo. Saltando i messaggi di tipo 'tool', il testo
    grezzo del tool non esce come se fosse una risposta; l'esito dei tool di AZIONE
    (merge/...) resta gestito da _tool_result.
    """
    if not isinstance(chunk, dict):
        return ""
    model = chunk.get("model")
    msgs = model.get("messages") if isinstance(model, dict) else None
    if not msgs:
        return ""
    m = msgs[-1]
    if getattr(m, "type", "") == "tool":
        return ""  # niente testo grezzo dai tool
    c = getattr(m, "content", None)
    if isinstance(c, str):
        return c
    if isinstance(c, list):
        return "".join(p.get("text", "") for p in c if isinstance(p, dict))
    return ""


def _tools(chunk) -> list[str]:
    if not isinstance(chunk, dict):
        return []
    model = chunk.get("model")
    msgs = model.get("messages") if isinstance(model, dict) else None
    if not msgs:
        return []
    m = msgs[-1]
    out = []
    for tc in (getattr(m, "tool_calls", None) or []):
        if isinstance(tc, dict):
            name = tc.get("name")
        else:
            name = getattr(tc, "name", None)
        if name:
            out.append(name)
    return out


def _todos(chunk) -> list[str]:
    """Ritorna gli aggiornamenti della todo list (todo del middleware TodoList).

    Il TodoListMiddleware (langchain agents.middleware.todo) chiama il tool
    `write_todos` con args {"todos": [{content, status}, ...]}; il campo testuale
    è `content`, NON `task`/`todo` (fix 16/10: prima leggeva i campi sbagliati e
    la task list in chat non appariva mai). Se il tool non è ancora stato
    chiamato non c'è niente da mostrare: possiamo anche provare a derivare le
    righe dai messaggi recenti.
    """
    if not isinstance(chunk, dict):
        return []
    model = chunk.get("model")
    msgs = model.get("messages") if isinstance(model, dict) else None
    if not msgs:
        return []
    m = msgs[-1]
    out: list[str] = []
    for tc in (getattr(m, "tool_calls", None) or []):
        name = tc.get("name") if isinstance(tc, dict) else getattr(tc, "name", None)
        if name not in ("write_todos", "todo", "todo_list"):
            continue
        args = tc.get("args") if isinstance(tc, dict) else getattr(tc, "args", {}) or {}
        for item in (args.get("todos") or args.get("items") or []):
            if isinstance(item, dict):
                t = item.get("content") or item.get("task") or item.get("todo") or ""
            else:
                t = str(item)
            if t:
                out.append(str(t))
    return out


def _interrupt_name(chunk) -> str | None:
    if not isinstance(chunk, dict):
        return None
    inter = chunk.get("__interrupt__")
    if inter is None:
        return None
    first = inter[0] if isinstance(inter, (tuple, list)) else inter
    value = getattr(first, "value", first)
    if isinstance(value, dict):
        reqs = value.get("action_requests") or []
        if reqs:
            return reqs[0].get("name", "azione")
    return "azione"


def _evt(v: str) -> str:
    return f"data: {json.dumps(v)}\n\n"


def _file_confirmation_note(goal: str) -> str:
    """Problema 2 (fix 20/10): conferma merge nel SERVER, prima dell'LLM.

    L'LLM (Ollama) tende a "sistemare" da solo i nomi file scritti dall'utente
    (es. 'scheda_1726' -> 'scheda-1726.pdf'), quindi il tool riceve il nome giusto
    e unisce SENZA chiedere nulla. Qui confrontiamo i token del goal coi file
    reali del workspace: se un nome non esiste esattamente ma ne esiste uno
    simile, prependiamo una nota che OBBLIGA l'agente a chiedere conferma.
    """
    if not goal:
        return ""
    from app.deep_agent.tools.workspace import _root

    root = _root()
    if root is None or not root.is_dir():
        return ""
    real_files = {f.name for f in root.rglob("*") if f.is_file()}
    if not real_files:
        return ""

    import re as _re
    # token tipo file: basename senza estensione o con underscore/trattino/punti
    tokens = set()
    for tok in _re.split(r"[\s,;:!?()']+", goal):
        if len(tok) < 2:
            continue
        # vogliamo solo candidati "nome file-like" (con .est, o con _ e -)
        if ("." in tok or "_" in tok or "-" in tok) and "" != tok:
            tokens.add(tok.strip().lower())
    if not tokens:
        return ""

    # normalizza: togli eventuale estensione per il confronto fuzzy
    def norm(t: str) -> str:
        return t.rsplit(".", 1)[0].replace("_", "-").replace(" ", "-").lower()

    real_lower = {f.lower() for f in real_files}
    real_noext = {f.lower().rsplit(".", 1)[0] for f in real_files}
    real_norm = {norm(f) for f in real_files}
    fuzzy = []
    for tok in sorted(tokens):
        t = tok.lower()
        # CONFRONTO ESATTO sul nome grezzo (caso-insensitive): se il token o
        # token+.pdf corrisponde a un file reale, niente conferma.
        if t in real_lower or t + ".pdf" in real_lower or t in real_noext:
            continue
        # else: fuzzy sul nome normalizzato (_/-/spazi -> -) per intercettare
        # nomi simili ma non identici (es. scheda_1726 vs scheda-1726.pdf).
        from difflib import get_close_matches
        candidates = get_close_matches(norm(t), real_norm, n=1, cutoff=0.6)
        if candidates:
            fuzzy.append((tok, candidates[0]))
    if not fuzzy:
        return ""

    lines = [
        "Question di conferma (server, hard block): hai scritto uno o più nomi "
        "file che NON combaciano esattamente con i file nel workspace. Prima di "
        "eseguire qualsiasi operazione devo confermare. Procedi?"
    ]
    for tok, real_name in fuzzy:
        lines.append(f"- hai scritto '{tok}' -> nel workspace c'è '{real_name}'")
    return "\n".join(lines)


def _tool_result(chunk) -> str:
    """Ritorna il contenuto testuale dell'ULTIMO ToolMessage se presente.

    Dopo una chiamata tool, l'agente riceve un ToolMessage il cui `.content` è
    l'esito del tool (es. "✓ PDF uniti in: x.pdf"). Se il modello poi non produce
    un messaggio di testo riepilogativo, quel risultato è tutto ciò che abbiamo
    per mostrare l'esito all'utente.

    IMPORTANTE (fix 19/10): deepagents usa DUE nodi — `model` (LLM) e `tools`
    (esecuzione tool). Il ToolMessage con l'esito sta nel nodo **tools**, non in
    model. Prima leggevamo solo `chunk["model"]` e quindi l'esito del merge non
    veniva mai trovato → la chat restava al "[STEP] merge_pdf" e poi spariva.
    Ora scandiamo TUTTE le partizioni (model, tools, ...) del chunk.
    """
    if not isinstance(chunk, dict):
        return ""
    for part in chunk.values():
        msgs = part.get("messages") if isinstance(part, dict) else None
        if not msgs:
            continue
        m = msgs[-1]
        role = getattr(m, "type", "")
        if role != "tool":
            continue
        c = getattr(m, "content", None)
        if isinstance(c, str) and c.strip():
            return c.strip()
        if isinstance(c, list):
            t = "".join(p.get("text", "") for p in c if isinstance(p, dict) and p.get("text"))
            if t:
                return t
    return ""


async def _events(agent, goal: str, thread_id: str, history: list[dict] | None = None):
    cfg = {"configurable": {"thread_id": thread_id, "checkpoint_ns": "", "checkpoint_id": ""}}
    SESSIONS[thread_id] = {"agent": agent, "config": cfg}
    yield _evt(f"[THREAD] {thread_id}")
    # Fix 2 (hard block, 20/10): se il goal contiene un nome file che non
    # combacia esattamente coi file reali (es. chiede scheda_1726 ma esiste
    # scheda-1726.pdf), NIENTE LLM — emettiamo subito la domanda di conferma e
    # chiudiamo. Così l'LLM/Ollama non può "sistemare" il nome da solo né
    # eseguire l'operazione di testa sua.
    hard_block = _file_confirmation_note(goal)
    if hard_block:
        yield _evt(hard_block)
        SESSIONS.pop(thread_id, None)
        yield _evt("[DONE]")
        return
    msgs = []
    for h in history or []:
        role = h.get("role", "user")
        content = h.get("content", "")
        if content and role in ("user", "assistant"):
            msgs.append({"role": role, "content": content})
    msgs.append({"role": "user", "content": goal})
    saw_tool = False
    sent_tool_result = False
    # dedup #5 (19/10): il testo doppio "✓ PDF uniti…✓ PDF uniti…" nasceva perché
    # _text emette sia il ToolMessage (esito del tool) sia il messaggio finale
    # dell'LLM che ripete la stessa stringa. Ricordiamo l'ultimo contenuto emesso
    # e se un testo identico arriva di nuovo, lo saltiamo.
    last_emitted = ""
    # Fix 4 (20/10): dedup per esiti. L'LLM a volte ripete lo STESSO esito con
    # testo diverso (es. "✓ PDF uniti in: X.pdf" + "L'unicione è stata completata
    # con successo: X.pdf"). Il dedup #5 saltava solo testi IDENTICI; qui teniamo
    # traccia del "filename outlet" (X.pdf) già emesso e saltiamo un testo breve
    # che riferimento lo stesso esito senza aggiungere contenuto nuovo.
    emitted_outcomes: set[str] = set()

    def _outcome_key(txt: str) -> str | None:
        # estrae il nome del file di output citato nell'esito (es. "... in: X.pdf")
        import re as _re
        m = _re.search(r"\b([\w-]+\.pdf)\b", txt)
        return m.group(1).lower() if m else None

    async for chunk in agent.astream({"messages": msgs}, config=cfg):
        name = _interrupt_name(chunk)
        if name:
            yield _evt(f"[HITL] {name}")
            return
        for t in _todos(chunk):
            yield _evt(f"[TASK] {t}")
        for t in _tools(chunk):
            saw_tool = True
            yield _evt(f"[STEP] {t}")
        t = _text(chunk)
        key = _outcome_key(t) if t else None
        if t:
            # dedup #5: identico già emesso
            if t.strip() and t.strip() == last_emitted.strip():
                last_emitted = t.strip()
                continue
            # Fix 4: breve e sta solo ripetendo un esito già emesso (stesso file)
            if key and key in emitted_outcomes and len(t.strip()) < 160:
                last_emitted = t.strip()
                continue
            yield _evt(t)
            last_emitted = t.strip()
            if key:
                emitted_outcomes.add(key)
            sent_tool_result = True  # testo normale già emesso, niente fallback
        else:
            r = _tool_result(chunk)
            if r and not sent_tool_result:
                # Il tool ha prodotto un esito ma il modello non lo ha riassunto:
                # lo mostriamo noi (fix Bug 14 — il merge non deve più "sparire").
                if r.strip() == last_emitted.strip():
                    last_emitted = r.strip()
                    continue
                rk = _outcome_key(r)
                if rk and rk in emitted_outcomes and len(r.strip()) < 160:
                    last_emitted = r.strip()
                    continue
                yield _evt(r)
                last_emitted = r.strip()
                if rk:
                    emitted_outcomes.add(rk)
                sent_tool_result = True
    SESSIONS.pop(thread_id, None)
    yield _evt("[DONE]")


async def _resume_events(thread_id: str, decision: dict):
    sess = SESSIONS.get(thread_id)
    if not sess:
        yield _evt("[DONE]")
        return
    agent, cfg = sess["agent"], sess["config"]
    async for chunk in agent.astream(Command(resume={"decisions": [decision]}), config=cfg):
        name = _interrupt_name(chunk)
        if name:
            yield _evt(f"[HITL] {name}")
            return
        for t in _todos(chunk):
            yield _evt(f"[TASK] {t}")
        for t in _tools(chunk):
            yield _evt(f"[STEP] {t}")
        t = _text(chunk)
        if t:
            yield _evt(t)
    SESSIONS.pop(thread_id, None)
    yield _evt("[DONE]")


@app.post("/chat")
async def chat(req: ChatReq):
    # fix 19/10: l'utente autenticato della sessione DEVE arrivare ai tool PDF
    # (merge/split/...). Senza, falliscono con "Nessun utente risolto: imposta
    # PDFMIND_USER_ID oppure esiste admin@pdfeditor.local".
    from app.deep_agent.tools.pdf_ops import set_current_user_id
    set_current_user_id(req.user_id)
    agent = build_agent(req.model, req.profile)
    return StreamingResponse(
        _events(agent, req.goal, uuid.uuid4().hex, req.history),
        media_type="text/event-stream",
    )


class ApproveReq(BaseModel):
    thread_id: str
    approve: bool


@app.post("/approve")
async def approve(req: ApproveReq):
    if req.thread_id not in SESSIONS:
        return JSONResponse({"error": "sessione non trovata"}, status_code=404)
    decision = {"type": "approve" if req.approve else "reject"}
    return StreamingResponse(_resume_events(req.thread_id, decision), media_type="text/event-stream")