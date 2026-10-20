import json
import os
import uuid

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command
from pydantic import BaseModel

from app.deep_agent.agents.pdfmind import build_agent

app = FastAPI(title="PdfMind")

# Sessione HITL: thread_id -> {"agent", "config"} per riprendere uno stream interrotto
SESSIONS: dict[str, dict] = {}

# Punto 5: checkpointer PERSISTENTE per thread (per-sessione). Oggi build_agent
# creava un MemorySaver nuovo a ogni /chat e quindi lo stato (inclusa la sospensione
# HITL) andava perso tra un turno e l'altro. Con un checkpointer stabile per
# thread_id l'HITL persiste davvero tra i turni della stessa sessione.
CHECKPOINTERS: dict[str, MemorySaver] = {}


def _stable_thread_id(user_id: str | None, client_thread: str | None = None) -> str:
    """Punto 5: thread_id STABILE per sessione.

    Se il client passa il proprio thread (riusando l'[THREAD] ricevuto), lo si usa;
    altrimenti lo si deriva dall'user_id della sessione (stabile tra i turni dello
    stesso utente). Solo in assenza di user_id si ripiega su un uuid casuale.
    """
    if client_thread:
        return client_thread
    if user_id:
        import hashlib
        return "pdfmind_" + hashlib.sha1(("pdfmind:" + user_id).encode()).hexdigest()[:16]
    return uuid.uuid4().hex

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
    # Punto 5: il client può riusare il thread_id ricevuto dall'evento [THREAD]
    # (HITL persistente); altrimenti il server lo deriva dall'user_id.
    thread_id: str | None = None


def _state(chunk) -> dict:
    """Estrae lo stato agente da un chunk del stream Pregel v2 (stream_mode=values).

    In v2 ogni chunk e' un dict {'type': 'values', 'ns': [...], 'data': <stato>,
    'interrupts': (Interrupt, ...)} (verificato con inspect su Pregel 0.7.x).
    """
    if not isinstance(chunk, dict):
        return {}
    data = chunk.get("data")
    return data if isinstance(data, dict) else {}


def _text(chunk) -> str:
    """Ritorna il testo dell'ultimo messaggio, ma NON i ToolMessage.

    Fix 19/10 (Problema 1, Mirko): per i tool di LETTURA (es. elenca_workspace)
    l'esito era emesso due volte — il ToolMessage grezzo qui e poi il riassunto
    dell'LLM in un chunk successivo. Saltando i messaggi di tipo 'tool', il testo
    grezzo del tool non esce come se fosse una risposta; l'esito dei tool di AZIONE
    (merge/...) resta gestito da _tool_result.
    """
    st = _state(chunk)
    model = st.get("model")
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
    st = _state(chunk)
    model = st.get("model")
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
    chiamato non c'è niente da mostrare.
    """
    st = _state(chunk)
    model = st.get("model")
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
    """Ritorna il nome del tool in attesa di conferma (HITL nativo, v2).

    In v2 gli interrupt arrivano nativamente in `chunk["interrupts"]` come oggetti
    `Interrupt` il cui `.value` è la `HITLRequest` con `action_requests`
    (verificato con inspect). Ogni action_requests[0] ha un campo `name`.
    """
    if not isinstance(chunk, dict):
        return None
    for inter in (chunk.get("interrupts") or []):
        value = getattr(inter, "value", inter)
        if isinstance(value, dict):
            reqs = value.get("action_requests") or []
            if reqs:
                return reqs[0].get("name", "azione")
    return None


def _evt(v: str) -> str:
    return f"data: {json.dumps(v)}\n\n"


def _tool_result(chunk) -> str:
    """Ritorna il contenuto testuale dell'ULTIMO ToolMessage se presente.

    Dopo una chiamata tool, l'agente riceve un ToolMessage il cui `.content` è
    l'esito del tool (es. "✓ PDF uniti in: x.pdf"). Se il modello poi non produce
    un messaggio di testo riepilogativo, quel risultato è tutto ciò che abbiamo
    per mostrare l'esito all'utente.

    IMPORTANTE (fix 19/10): deepagents usa DUE nodi — `model` (LLM) e `tools`
    (esecuzione tool). Il ToolMessage con l'esito sta nel nodo **tools**, non in
    model. Ora scandiamo TUTTE le partizioni (model, tools, ...) dello stato.
    """
    st = _state(chunk)
    for part in st.values():
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
    # Punto 1 (HITL nativo): il workaround testuale _file_confirmation_note è
    # stato RIMOSSO. La conferma dei nomi file (es. merge con nome non esatto)
    # ora è gestita dall'HITL nativo via InterruptOnConfig + predicato `when`
    # in agents/pdfmind.py: l'agente si FERMA davvero (interrupt) solo quando
    # serve conferma, e si riprende con Command(resume=...) preservando lo stato.
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
    # Fix 1.5 (20/10): il doppione nasce perché l'esito del tool veniva emesso
    # SUBITO (via _tool_result) e poi l'LLM produceva un riassunto diverso.
    # Teniamo l'esito in `pending_tool_result` e lo mostriamo SOLO se, a fine
    # stream, l'LLM non ha prodotto alcun testo (feedback Bug 14: il merge non
    # deve più "sparire"). Così per i tool di lettura (elenca_workspace) esce
    # solo il riassunto dell'LLM, per il merge solo l'esito.
    pending_tool_result = ""
    emitted_outcomes: set[str] = set()

    def _outcome_key(txt: str) -> str | None:
        # estrae il nome del file di output citato nell'esito (es. "... in: X.pdf")
        import re as _re
        m = _re.search(r"\b([\w-]+\.pdf)\b", txt)
        return m.group(1).lower() if m else None

    # Punto 2 (streaming): stream Pregel v2 (stream_mode="values", version="v2")
    # al posto del parsing manuale dei chunk v1 (chunk["model"]/["tools"]). In v2
    # gli interrupt arrivano nativamente in chunk["interrupts"] (verificato).
    async for chunk in agent.astream({"messages": msgs}, config=cfg, stream_mode="values", version="v2"):
        name = _interrupt_name(chunk)
        if name:
            if pending_tool_result:
                yield _evt(pending_tool_result)
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
            # testo normale presente → niente fallback con l'esito del tool
            pending_tool_result = ""
        else:
            r = _tool_result(chunk)
            if r and not sent_tool_result:
                # Buffer, non emettere subito: potrebbe arrivare il riassunto LLM.
                pending_tool_result = r.strip()
                sent_tool_result = True
                last_emitted = r.strip()
    # a fine stream: se c'era un esito tool ma nessun testo è stato emesso, lo
    # mostriamo noi (fix Bug 14 — il merge non deve più "sparire")
    if pending_tool_result and pending_tool_result not in emitted_outcomes:
        yield _evt(pending_tool_result)
    SESSIONS.pop(thread_id, None)
    yield _evt("[DONE]")


async def _resume_events(thread_id: str, decision: dict):
    sess = SESSIONS.get(thread_id)
    if not sess:
        yield _evt("[DONE]")
        return
    agent, cfg = sess["agent"], sess["config"]
    # Ripresa HITL nativa: Command(resume={"decisions": [decision]}) riprende dal
    # punto di interruzione preservando lo stato (non rielabora i vecchi messaggi).
    async for chunk in agent.astream(Command(resume={"decisions": [decision]}), config=cfg, stream_mode="values", version="v2"):
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
    # Punto 5: thread_id stabile per sessione (derivato da user_id o riusato dal
    # client) + checkpointer persistente -> lo stato HITL non si perde tra i turni.
    thread_id = _stable_thread_id(req.user_id, req.thread_id)
    checkpointer = CHECKPOINTERS.setdefault(thread_id, MemorySaver())
    agent = build_agent(req.model, req.profile, checkpointer=checkpointer)
    return StreamingResponse(
        _events(agent, req.goal, thread_id, req.history),
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