import json
import os
import uuid

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command
from pydantic import BaseModel

from app.deep_agent.agents.pdfmind import build_agent, _wants_listing, _wants_operation, _wants_tool, _is_positive_confirmation  # noqa: E501

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
    Lo stato `data` è APPIAITTITO: {'messages': [...], 'files': {...}} — NON ha
    più le partizioni model/tools della vecchia forma updates.
    """
    if not isinstance(chunk, dict):
        return {}
    data = chunk.get("data")
    return data if isinstance(data, dict) else {}


def _msgs(chunk) -> list:
    """La lista messaggi piatta dello stato values v2 (data['messages'])."""
    st = _state(chunk)
    msgs = st.get("messages")
    return msgs if isinstance(msgs, list) else []


def _text(chunk) -> str:
    """Ritorna il testo dell'ultimo messaggio, ma NON i ToolMessage né l'input umano.

    Fix 19/10 (Problema 1, Mirko): per i tool di LETTURA (es. elenca_workspace)
    l'esito era emesso due volte — il ToolMessage grezzo qui e poi il riassunto
    dell'LLM in un chunk successivo. Saltando i messaggi di tipo 'tool', il testo
    grezzo del tool non esce come se fosse una risposta; l'esito dei tool di AZIONE
    (merge/...) resta gestito da _tool_result.

    In stream_mode='values' lo stato include anche i messaggi di INPUT (human) e
    system; saltandoli non facciamo uscire il goal dell'utente come risposta.
    """
    msgs = _msgs(chunk)
    if not msgs:
        return ""
    m = msgs[-1]
    mtype = getattr(m, "type", "")
    if mtype in ("tool", "human", "system"):
        return ""  # niente tool grezzo, niente input utente, niente system
    c = getattr(m, "content", None)
    if isinstance(c, str):
        return c
    if isinstance(c, list):
        return "".join(p.get("text", "") for p in c if isinstance(p, dict))
    return ""


def _tools(chunk) -> list[str]:
    msgs = _msgs(chunk)
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
    msgs = _msgs(chunk)
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


def _interrupt_name(chunk) -> tuple[str, str] | None:
    """Ritorna (nome_tool, description) del tool in attesa di conferma (HITL, v2).

    In v2 gli interrupt arrivano nativamente in `chunk["interrupts"]` come oggetti
    `Interrupt` il cui `.value` è la `HITLRequest` con `action_requests`
    (verificato con inspect). Ogni action_requests[0] ha `name` e `description`
    (fix 22/10: la description dinamica coi nomi file arriva FINO al client).
    """
    if not isinstance(chunk, dict):
        return None
    for inter in (chunk.get("interrupts") or []):
        value = getattr(inter, "value", inter)
        if isinstance(value, dict):
            reqs = value.get("action_requests") or []
            if reqs:
                name = reqs[0].get("name", "azione")
                desc = reqs[0].get("description", "") or ""
                return (name, desc)
    return None


def _evt(v: str) -> str:
    return f"data: {json.dumps(v)}\n\n"


# Strumenti che eseguono un'OPERAZIONE reale sui file (non di sola lettura).
# Servono al guard anti-fake: se l'utente chiede un'operazione ma nessuno di
# questi tool è stato chiamato nel turno, il modello ha solo "raccontato" di
# averla fatta senza eseguirla -> emettiamo l'avviso "NON eseguito".
OPERATIVE_TOOLS = {
    "merge_pdfs",
    "split_pdf",
    "sign_pdf",
    "annotate_pdf",
    "ocr_pdf",
    "compress_pdf",
    "convert_docx_to_pdf",
    "scrivi_output",
    "elimina_file",
    "elimina_tutti_in_output",
}

# Verbi/espressioni che indicano una richiesta di OPERAZIONE nel messaggio
# utente. Se il goal ne contiene almeno uno, l'intenzione è operativa.
# NOTA: le funzioni di intent (_wants_operation/_wants_listing/_wants_tool) e le
# relative parola-chiave vivono in agents/pdfmind.py (dove le usa
# ForceToolCallMiddleware) e vengono IMPORTATE qui, per non avere due copie
# divergenti.


def _tool_result(chunk) -> str:
    """Ritorna il contenuto testuale dell'ULTIMO ToolMessage se presente.

    Dopo una chiamata tool, l'agente riceve un ToolMessage il cui `.content` è
    l'esito del tool (es. "✓ PDF uniti in: x.pdf"). Se il modello poi non produce
    un messaggio di testo riepilogativo, quel risultato è tutto ciò che abbiamo
    per mostrare l'esito all'utente.

    IMPORTANTE (fix 20/10 HITL+streaming): con stream_mode='values' v2 lo stato
    `data` è appiattito — la lista messaggi sta direttamente in data['messages'],
    NON più annidata sotto partizioni model/tools. Leggiamo quindi quella lista e
    prendiamo l'ultimo ToolMessage.
    """
    msgs = _msgs(chunk)
    if not msgs:
        return ""
    m = msgs[-1]
    if getattr(m, "type", "") != "tool":
        return ""
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
    saw_operative_tool = False
    sent_tool_result = False
    # 22/10 fix #3: determiniamo a monte se la richiesta richiede uno strumento
    # (operazione, elenco/lettura) o è una CONFERMA positiva a un'operazione chiesta
    # prima. In quel caso il testo del modello viene bufferizzato e mostrato SOLO
    # se uno strumento è stato davvero chiamato (niente "risposta a memoria" che
    # racconta di aver eliminato/unito senza eseguire). Per le conversazioni
    # normali ("ciao") lo streaming resta live come sempre.
    request_wants_op = _wants_operation(goal)
    request_wants_tool = request_wants_op or _wants_listing(goal)
    if not request_wants_tool and _is_positive_confirmation(goal):
        # conferma a un'operazione chiesta prima: risali all'ultimo messaggio umano
        for h in reversed(history or []):
            if h.get("role") != "user":
                continue
            hc = str(h.get("content", "") or "")
            if _wants_operation(hc) or _wants_listing(hc):
                request_wants_tool = True
                request_wants_op = _wants_operation(hc)
                break
    buffered_text: list[str] = []
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
        hitl = _interrupt_name(chunk)
        if hitl:
            if pending_tool_result:
                yield _evt(pending_tool_result)
            # fix 22/10: la description (coi nomi file) viaggia col nome tool
            name, desc = hitl
            yield _evt(f"[HITL] {name}" + (f"||{desc}" if desc else ""))
            return
        for t in _todos(chunk):
            yield _evt(f"[TASK] {t}")
        for t in _tools(chunk):
            saw_tool = True
            if t in OPERATIVE_TOOLS:
                saw_operative_tool = True
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
            if request_wants_tool:
                # bufferizza: decideremo a fine stream se era vera o "a memoria"
                buffered_text.append(t)
            else:
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
    # GUARD ANTI-FAKE potenziato (22/10): la richiesta richiedeva uno strumento
    # (operazione O elenco O conferma) ma in questo turno NON è stato chiamato
    # nessuno strumento pertinente. Il testo bufferizzato era solo una "risposta a
    # memoria" (raccontava di aver unito/eliminato senza eseguire): NON lo mostriamo
    # come vero, al suo posto emettiamo l'avviso esplicito.
    if request_wants_tool and not pending_tool_result:
        executed = saw_operative_tool if request_wants_op else (saw_tool or saw_operative_tool)
        if not executed:
            buffered_text = []
            yield _evt("⚠️ NON eseguito: la richiesta richiedeva uno strumento ma nessuno è stato chiamato. Nessun file è stato modificato.")
    # emissione del testo bufferizzato SOLO se l'operazione/lettura è stata eseguita
    for b in buffered_text:
        yield _evt(b)
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
        hitl = _interrupt_name(chunk)
        if hitl:
            name, desc = hitl
            yield _evt(f"[HITL] {name}" + (f"||{desc}" if desc else ""))
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