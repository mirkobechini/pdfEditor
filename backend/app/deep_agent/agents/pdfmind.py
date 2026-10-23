import os

from deepagents import create_deep_agent
from langchain.agents.middleware import AgentMiddleware, TodoListMiddleware
from langchain.agents.middleware.human_in_the_loop import InterruptOnConfig
from langchain.chat_models import init_chat_model
from langgraph.checkpoint.memory import MemorySaver

from app.deep_agent.config import ordered_providers, fallback_enabled
from app.deep_agent.tools.docs import (confronta_versioni, elenca_file, estrai_date, leggi_pdf, riassumi_pdf)  # noqa: E501
from app.deep_agent.tools.profile import get_tools

# Default sicuro: tag VALIDO di Ollama (i modelli reali installati da Mirko sono
# `qwen3.5:9b`/`qwen3.5:9b-nothink`). Prima c'era `ollama:qwen3.5` (senza tag) che
# su Ollama non esiste -> errore 404. Il tag non-hink è più affidabile per il tool
# calling (il reasoner talvolta risponde a memoria senza chiamare lo strumento).
DEF_MODEL = "ollama:qwen3.5:9b-nothink"

# ─────────────────────────────────────────────────────────────────────────────
# Orchestrazione host-side (fix 3, 21/10): niente risposta "a memoria".
# Pattern DOCUMENTATO (context7, deepagents/langchain): il middleware
# `wrap_model_call` può cambiare per richiesta i tool offerti al modello e il
# `tool_choice`. Test sul modello reale (qwen3.5:9b-nothink): con superficie
# ristretta al tool pertinente + tool_choice la chiamata è stabile 3/3, con
# tutti i 25 tool esposti è flaky (il modello risponde a parole senza chiamare
# nulla). Quindi: quando l'ultimo messaggio umano richiede uno strumento,
# restringiamo la surface al tool giusto e forziamo la chiamata.
# ─────────────────────────────────────────────────────────────────────────────

# Intent → nomi dei tool pertinenti (match per parole chiave sul goal utente).
_INTENT_TOOLS: tuple[tuple[tuple[str, ...], tuple[str, ...]], ...] = (
    (("elenca", "elenco", "che file", "quali file", "lista", "listami", "sistemami"), ("elenca_workspace",)),
    (("unisci", "unisc", "unire", "merge", "unir"), ("merge_pdfs",)),
    (("dividi", "dividere", "split", "separ", "in due"), ("split_pdf",)),
    (("firma", "firmar", "firmami"), ("sign_pdf",)),
    (("annot", "evidenzi"), ("annotate_pdf",)),
    (("ocr", "riconosci il testo"), ("ocr_pdf",)),
    (("comprim", "compress"), ("compress_pdf",)),
    (("convert", "trasform", "converti"), ("convert_docx_to_pdf",)),
    (("scrivi", "scrivi", "salva un", "crea un"), ("scrivi_output",)),
    (("elimina", "eliminar", "cancell", "rimuovi", "rimuover", "cancella"), ("elimina_file", "elimina_tutti_in_output")),
)


def _is_capability_question(goal: str) -> bool:
    """True se il messaggio è una DOMANDA di capacità GENERICA ("puoi eliminare dei
    file?", "sai unire i pdf?") — non una richiesta operativa. Il guard/middleware
    non deve forzare strumenti su una domanda: il modello risponde in modo
    conversazionale.

    Se il goal contiene un nome-file riconoscibile (trattino, underscore o .pdf)
    è una richiesta CONCRETA (es. "puoi unire scheda_1726 e temp?") e quindi NON
    è una domanda di capacità: va eseguita.
    """
    g = (goal or "").strip().lower()
    if not g.endswith("?"):
        return False
    starters = ("puoi", "posso", "sai", "è possibile", "e' possibile", "si può", "si puo", "saresti", "riesci")
    if not any(g.startswith(s) for s in starters):
        return False
    # nome-file concreto presente -> richiesta reale, non domanda generica
    for ch in ("-", "_", ".pdf"):
        if ch in g:
            return False
    return True


def _wants_operation(goal: str) -> bool:
    """True se il messaggio utente chiede un'operazione (unisci/elimina/firma...).

    Le domande di capacità ("puoi eliminare dei file?") NON contano come richiesta
    operativa: restano conversazione, niente forcing né guard.
    """
    if _is_capability_question(goal):
        return False
    g = (goal or "").lower()
    return any(w in g for w in ("unisci", "unisc", "unire", "merge", "unir",
                                 "dividi", "split", "separ", "firma", "annot",
                                 "ocr", "comprim", "compress", "convert",
                                 "scrivi", "elimina", "cancell", "rimuovi"))


_LISTING_WORDS = ("elenca", "elenco", "che file", "quali file", "lista",
                  "listami", "cosa c'è", "cosa c'e", "che cosa c'è", "che cosa c'e")


def _wants_listing(goal: str) -> bool:
    """True se il messaggio utente chiede dati dalla workspace (elenco/lettura)."""
    g = (goal or "").lower()
    return any(w in g for w in _LISTING_WORDS)


def _wants_tool(goal: str) -> bool:
    """True se la richiesta richiede un tool (operazione O elenco/lettura)."""
    return _wants_operation(goal) or _wants_listing(goal)


def _forced_tools_for_goal(goal: str, available: list) -> list:
    """Ritorna i tool disponibili pertinenti all'intento del goal (ordine stabile)."""
    g = (goal or "").lower()
    wanted: set[str] = set()
    for keywords, tool_names in _INTENT_TOOLS:
        if any(k in g for k in keywords):
            wanted.update(tool_names)
    if _wants_listing(goal):
        wanted.add("elenca_workspace")
    out: list = []
    for t in available:
        name = getattr(t, "name", None) or (t.get("name") if isinstance(t, dict) else None)
        if name in wanted:
            out.append(t)
    return out


# Parole di CONFERMA positiva (il goal corrente è una risposta breve all'operazione
# richiesta prima: "va bene", "si", "unisci anche quello"...) e NEGATIVA (no/annulla).
# Servono al middleware: quando il modello dovrebbe PROSEGUIRE un'operazione già
# chiesta, il forcing non deve dipendere dalle parole dell'ultimo messaggio.
_CONFIRM_WORDS = ("si", "sì", "va bene", "ok", "okay", "procedi", "confermo",
                   "vai", "certo", "fai pure", "unisci anche", "eliminali",
                   "procedi pure", "dai", "vai pure", "sistemami",
                   # 22/10: tentativo/ripetizione di un'operazione fallita -> va
                   # trattato come conferma dell'operazione precedente (così il
                   # retry host-side forza di nuovo lo strumento).
                   "riprova", "riprove", "ripeti", "fallo", "riprovo")
_NEGATIVE_WORDS = ("no", "annulla", "niente", "lascia", "basta", "stop", "non")


def _is_positive_confirmation(goal: str) -> bool:
    """True se il messaggio è una breve conferma positiva (non un'operazione nuova)."""
    g = (goal or "").strip().lower()
    if not g:
        return False
    if any(n in g for n in _NEGATIVE_WORDS):
        return False
    return len(g) < 60 and any(w in g for w in _CONFIRM_WORDS)


class ForceToolCallMiddleware(AgentMiddleware):
    """Quando l'ultimo messaggio utente richiede uno strumento (operazione o
    elenco) — o è una CONFERMA positiva a un'operazione appena chiesta —
    restringe i tool offerti al modello al sottoinsieme pertinente e forza
    `tool_choice` così il modello DEVE chiamare lo strumento — mai più
    una risposta "a memoria" tipo 'procedo/unisco' senza tool call.

    Attivo SOLO quando l'ultimo messaggio è umano (nuova richiesta o conferma),
    MAI dopo un ToolMessage (esito tool) — lì il modello deve poter riassumere
    liberamente. Per le conferme risale all'ULTIMA richiesta umana operativa
    del thread e forza lo strumento corrispondente (fix 22/10: "va bene" dopo
    una richiesta di eliminazione non deve far finta di eliminare).
    """

    name = "force_tool_call"

    def _force(self, request):
        msgs = getattr(request, "messages", None) or []
        if not msgs:
            return None
        last = msgs[-1]
        if getattr(last, "type", "") != "human":
            return None  # non è una nuova richiesta utente → niente forcing
        content = getattr(last, "content", "")
        if isinstance(content, list):
            content = " ".join(p.get("text", "") for p in content if isinstance(p, dict) and p.get("text"))
        goal = str(content or "")
        if _wants_tool(goal):
            forced = _forced_tools_for_goal(goal, request.tools)
        elif _is_positive_confirmation(goal):
            # conferma a un'operazione chiesta prima: risali all'ultima richiesta
            # umana con intento operativo nel thread corrente
            forced = []
            for m in reversed(msgs[:-1]):
                if getattr(m, "type", "") != "human":
                    continue
                pc = getattr(m, "content", "")
                if isinstance(pc, list):
                    pc = " ".join(p.get("text", "") for p in pc if isinstance(p, dict) and p.get("text"))
                prev_goal = str(pc or "")
                if _wants_tool(prev_goal):
                    forced = _forced_tools_for_goal(prev_goal, request.tools)
                    break
        else:
            forced = []
        if not forced:
            return None
        # 1 solo tool → tool_choice col NOME esatto (deterministico); più tool → "any".
        tool_choice = forced[0].name if len(forced) == 1 else "any"
        return request.override(tools=forced, tool_choice=tool_choice)

    def wrap_model_call(self, request, handler):
        forced_req = self._force(request)
        return handler(forced_req if forced_req is not None else request)

    async def awrap_model_call(self, request, handler):
        forced_req = self._force(request)
        return await handler(forced_req if forced_req is not None else request)



# Provider supportati dal resolver.
SUPPORTED_PREFIXES = ("ollama:", "anthropic:", "openai:", "openrouter:", "huggingface:")


def _resolve_model(m: str):
    """Costruisce il ChatModel con `init_chat_model` (punto 3).

    Mantiene la risoluzione multi-provider (ordered_providers) e base_url/api_key
    da env con lo stesso comportamento del vecchio resolver manuale
    (ChatOllama/ChatOpenAI/ChatAnthropic costruiti a mano).
    """
    if m.startswith("ollama:"):
        name = m.split(":", 1)[1]
        return init_chat_model(
            model=name,
            model_provider="ollama",
            base_url=os.environ.get("PDFMIND_OLLAMA_URL", "http://localhost:11434"),
            reasoning=False,
        )
    if m.startswith("anthropic:"):
        name = m.split(":", 1)[1]
        return init_chat_model(
            model=name,
            model_provider="anthropic",
            api_key=os.environ.get("PDFMIND_ANTHROPIC_API_KEY", ""),
            base_url=os.environ.get("PDFMIND_ANTHROPIC_BASE_URL") or None,
        )
    if m.startswith("openrouter:"):
        name = m.split(":", 1)[1]
        return init_chat_model(
            model=name,
            model_provider="openai",
            base_url=os.environ.get("PDFMIND_OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
            api_key=os.environ.get("PDFMIND_OPENROUTER_API_KEY", ""),
        )
    if m.startswith("huggingface:"):
        # Hugging Face Inference è OpenAI-compatible: usiamo il provider openai col suo endpoint.
        name = m.split(":", 1)[1]
        return init_chat_model(
            model=name,
            model_provider="openai",
            base_url=os.environ.get("PDFMIND_HF_BASE_URL", "https://api-inference.huggingface.co/v1"),
            api_key=os.environ.get("PDFMIND_HF_API_KEY", ""),
        )
    if m.startswith("openai:"):
        name = m.split(":", 1)[1]
        return init_chat_model(
            model=name,
            model_provider="openai",
            base_url=os.environ.get("PDFMIND_OPENAI_BASE_URL", "https://api.openai.com/v1"),
            api_key=os.environ.get("PDFMIND_OPENAI_API_KEY", ""),
        )
    return m


def _provider_usable(p: dict) -> bool:
    """Un provider è usable se ha un modello e (per i cloud) una key."""
    if not p.get("enabled", True):
        return False
    if not str(p.get("model", "")).strip():
        return False
    if p.get("provider") == "ollama":
        return True  # locale, nessuna key richiesta
    return bool(str(p.get("api_key", "")).strip())


def resolve_primary_model():
    """Ritorna il modello LLM del PRIMO provider abilitato e usable (precedenza, punto 7).

    Rispetta l'ordine della lista `providers` (indice 0 = massima priorità); se
    il primo non ha credenziali/modelo, scende al successivo (fallback strutturale).
    """
    for p in ordered_providers():
        if _provider_usable(p):
            return _resolve_model(f"{p['provider']}:{p['model']}")
    # fallback sicuro: niente di usable → Ollama di default
    return _resolve_model(DEF_MODEL)


DOCS_ANALYST = {
    "name": "docs-analyst",
    "description": "Analizza documenti PDF: riassunto, date e confronto versioni in un contesto isolato",
    "system_prompt": "Sei un analista di documenti. Usa solo gli strumenti forniti e riporta un risultato conciso.",
    "tools": [elenca_file, leggi_pdf, riassumi_pdf, estrai_date, confronta_versioni],
}



SYSTEM_PROMPT = (
    "Sei PdfMind, un assistente che lavora su una cartella workspace. Sei rapido e diretto: "
    "esegui, non racconti. "
    "REGLIA D'ORO: le tue PAROLE non eseguono nulla. L'unico modo per modificare, unire, "
    "eliminare o creare file è CHIAMARE LO STRUMENTO (tool). Se non chiami lo strumento, "
    "l'operazione NON è avvenuta: non dichiarare mai 'fatto', 'eliminato', 'unito', 'scritto' "
    "se non vedi l'esito restituito dallo strumento. Non scrivere mai frasi come 'procedo', "
    "'eseguo il merge', 'confermi?', 'vuoi che...?' al posto della chiamata allo strumento: "
    "se serve una conferma, sarà il SISTEMA a mostrarla con un pulsante (Procedi/Annulla). "
    "Quando l'utente chiede un'operazione (unisci, separi, firma, annota, OCR, comprimi, "
    "converti, SCRIVI, ELIMINA), chiama SUBITO lo strumento corrispondente senza fare "
    "domande preliminari e senza descrivere i passi: merge_pdfs, split_pdf, sign_pdf, "
    "annotate_pdf, ocr_pdf, compress_pdf, convert_docx_to_pdf, scrivi_output, elimina_file. "
    "Per le operazioni passa NEI PARAMETRI dello strumento i nomi dei file ESATTAMENTE come "
    "scritti dall'utente, senza normalizzarli (es. se l'utente scrive 'unisci scheda_1726 e "
    "temp', passi pdf_ids=['scheda_1726','temp'], NON 'scheda-1726.pdf'). Sarà il sistema a "
    "risolvere il nome reale e, se serve, a chiedere conferma con un pulsante. "
    "Per LEGGERE o ELENCARE (es. 'che file vedi?', 'elenca', 'riassumi', 'leggi') usa invece "
    "gli strumenti di lettura: elenca_workspace, leggi_workspace, elenca_file, leggi_pdf, "
    "riassumi_pdf, estrai_date. Non inventare mai l'elenco: riporta ESATTAMENTE quello che "
    "restituisce lo strumento. "
    "Non usare strumenti generici (read_file, glob, write_file, edit_file, delete) né "
    "percorsi assoluti inventati. "
    "PER ELIMINARE usa SEMPRE elimina_file (elimina solo dalla cartella output/ e richiede "
    "conferma tramite pulsante). Se l'utente chiede di eliminare TUTTI i file della "
    "cartella output (es. 'elimina tutti i file nella cartella output'), usa il tool "
    "elimina_tutti_in_output (una sola conferma per tutti). MAI dichiarare che un file è "
    "stato eliminato se lo strumento non ha restituito l'esito. "
    "La CRONOLOGIA è SOLO contesto: i messaggi passati servono a capire il filo del discorso, "
    "ma NON devi rieseguire azioni già richieste in passato. Esegui esclusivamente l'ultima "
    "richiesta dell'utente. "
    "Se l'utente risponde 'no' a una conferma, NON eseguire l'operazione e chiedi cosa "
    "vuole fare. Se risponde 'sì''/'ok'/'vai' a una conferma, chiama SUBITO lo strumento: "
    "non ripetere la domanda. "
    "Rispondi in italiano, con frasi brevi e naturali, confermando solo i risultati reali "
    "restituiti dagli strumenti."
)


INTERRUPT_ON = {
    "scrivi_output": True,
    "write_file": True,
    "edit_file": True,
    "delete": True,
}

# Punto 1 (HITL nativo): i tool che OPERANO su PDF esistenti del workspace
# (merge, split, sign, annotate, ocr, compress) si fermano SOLO quando serve
# davvero la conferma dell'utente, cioe' quando il nome file indicato dal modello
# NON corrisponde esattamente a un file reale ma ne esiste uno simile. Usiamo
# InterruptOnConfig + predicato `when` (verificato con inspect: deepagents 0.7.19)
# al posto del workaround testuale _file_confirmation_note nel server.
_CONFIRM_TOOLS = {"merge_pdfs", "split_pdf", "sign_pdf", "annotate_pdf", "ocr_pdf", "compress_pdf"}


def _pdf_tokens(name: str, args: dict) -> list[str]:
    """Estrae i token nome-PDF referenziati dagli args di un tool che opera."""
    if name == "merge_pdfs":
        v = args.get("pdf_ids")
        if isinstance(v, list):
            return [str(x) for x in v]
        if v:
            return [x.strip() for x in str(v).split(",") if x.strip()]
        return []
    v = args.get("pdf_id")
    return [str(v)] if v else []


def _needs_filename_confirmation(req) -> bool:
    """Predicato `when` per l'HITL nativo.

    Riceve un `ToolCallRequest` (inspect: ha `tool_call` con name/args). Ritorna
    True per INTERROMPERE il tool solo se un nome PDF referenziato non combacia
    esattamente con i file reali del workspace ma ne esiste uno simile (es. l'utente
    ha scritto 'scheda_1726' ma esiste 'scheda-1726.pdf'). Se tutti i nomi sono
    esatti (o non c'e' un match simile) il tool gira senza fermarsi.

    IMPORTANTE: il predicato gira di nuovo alla ripresa e DEVE dare la stessa
    risposta per lo stesso tool call; il lookup del workspace e' deterministico,
    quindi l'approvazione resta allineata ai decisioni batched.
    """
    call = req.tool_call if isinstance(req.tool_call, dict) else {}
    name = call.get("name")
    if name not in _CONFIRM_TOOLS:
        return False
    args = call.get("args") or {}
    from app.deep_agent.tools.workspace import _root as ws_root

    root = ws_root()
    if root is None or not root.is_dir():
        return False
    pdfs = [f.name for f in root.glob("*.pdf")]
    if not pdfs:
        return False
    pdf_lower = {f.lower() for f in pdfs}
    pdf_noext = {f.lower().rsplit(".", 1)[0] for f in pdfs}

    def norm(s: str) -> str:
        return (s or "").lower().strip().replace("_", "-").replace(" ", "-")

    pdf_norm = {norm(f): f for f in pdfs}
    from difflib import get_close_matches

    for tok in _pdf_tokens(name, args):
        t = (tok or "").strip().strip('"').strip("'").lower()
        if not t:
            continue
        # match ESATTO (sul nome grezzo case-insensitive, come il resolver): ok
        if t in pdf_lower or t + ".pdf" in pdf_lower or t in pdf_noext:
            continue
        # fuzzy: simile ma non identico -> serve conferma
        if get_close_matches(norm(t), list(pdf_norm), n=1, cutoff=0.6):
            return True
    return False


def _describe_action(tool_call, state, runtime) -> str:
    """Description HITL DINAMICA con i nomi file (richiesta Mirko 22/10).

    La description dell'InterruptOnConfig può essere un callable che riceve il
    tool_call reale: generiamo una frase leggibile che dice QUALI file sono
    coinvolti e (dove noto) quale file ne risulterà, invece del generico
    "sta per essere eseguita sui file indicati".
    """
    name = (tool_call or {}).get("name", "")
    args = (tool_call or {}).get("args") or {}

    def _ids():
        v = args.get("pdf_ids")
        if isinstance(v, list):
            return [str(x) for x in v]
        if v:
            return [x.strip() for x in str(v).split(",") if x.strip()]
        return []

    if name == "merge_pdfs":
        ids = _ids()
        out = (args.get("output_name") or "").strip()
        if not out and ids:
            out = "_".join(i.lower().replace(".pdf", "") for i in ids) + "_uniti.pdf"
        src = ", ".join(ids) if ids else "i PDF indicati"
        return f"Unisci {src} nel nuovo file: {out}" if out else f"Unisci {src}"
    if name == "split_pdf":
        return f"Dividi: {args.get('pdf_id') or 'il PDF indicato'}"
    if name == "elimina_file":
        # il tool usa il parametro 'nome' (non 'rel'/'name'): leggiamo quello,
        # così l'HITL mostra il NOME REALE del file (fix 23/10, Mirko)
        fname = args.get("nome") or args.get("rel") or args.get("name") or "il file indicato"
        return f"Elimina PERMANENTEMENTE: {fname} (dalla cartella output/)"
    if name == "elimina_tutti_in_output":
        return "Elimina PERMANENTEMENTE TUTTI i file nella cartella output/ (i sorgenti restano intatti)"
    # tool operativi su un singolo PDF (sign/annotate/ocr/compress/convert)
    target = args.get("pdf_id") or args.get("rel") or args.get("input") or "il PDF indicato"
    labels = {
        "sign_pdf": "Firma il PDF",
        "annotate_pdf": "Annota il PDF",
        "ocr_pdf": "Esegui OCR sul PDF",
        "compress_pdf": "Comprimi il PDF",
        "convert_docx_to_pdf": "Converti in PDF",
        "scrivi_output": "Scrivi il file",
    }
    return f"{labels.get(name, 'Esegui')}: {target}"


def _confirm_config(tool: str) -> InterruptOnConfig:
    # 22/10 (Mirko): conferma SEMPRE per le operazioni, anche a file esatti.
    # Prima il predicato `when` interrompeva solo se il nome non combaciava
    # esattamente ma esisteva un match simile; ora ogni operazione richiede il
    # bottone Procedi/Annulla, così l'utente vede sempre cosa sta per succedere.
    # NOTA: `when` DEVE essere un callable (non un bool): deepagents lo invoca
    # con `when(req)`, quindi True crasherebbe con "'bool' object is not callable".
    # 22/10: description DINAMICA (callable) coi nomi file coinvolti e il risultato.
    return InterruptOnConfig(
        allowed_decisions=["approve", "reject"],
        description=_describe_action,
        when=lambda req: True,
    )


# Punto 1: la mappa interrupt_on finale. I tool sensibili in scrittura restano
# sempre-interrupt (True); i tool che operano su PDF esistenti usano il predicato.
# 22/10: ora anche merge/split/sign/annotate/ocr/compress sono sempre-interrupt
# (conferma SEMPRE, per scelta di Mirko).
INTERRUPT_ON = {
    "scrivi_output": True,
    "write_file": True,
    "edit_file": True,
    "delete": True,
    # 22/10: elimina_file e il bulk usano _confirm_config (conferma SEMPRE) così il
    # bottone mostra la description coi nomi file, non il fallback grezzo di deepagents
    # ("Tool execution requires approval Tool: ... Args: ...").
    "elimina_file": _confirm_config("elimina_file"),
    "elimina_tutti_in_output": _confirm_config("elimina_tutti_in_output"),
    **{tool: _confirm_config(tool) for tool in _CONFIRM_TOOLS},
}


def build_agent(model: str | None = None, profile: str = "user", checkpointer: MemorySaver | None = None):
    m = model or os.environ.get("PDFMIND_MODEL", DEF_MODEL)
    effective_model = resolve_primary_model() if (model is None and not os.environ.get("PDFMIND_MODEL")) else _resolve_model(m)
    return create_deep_agent(
        model=effective_model,
        tools=get_tools(profile),
        middleware=[TodoListMiddleware(), ForceToolCallMiddleware()],
        subagents=[DOCS_ANALYST],
        interrupt_on=INTERRUPT_ON,
        checkpointer=checkpointer or MemorySaver(),
        system_prompt=SYSTEM_PROMPT,
    )


def run_goal(goal: str, model: str | None = None, profile: str = "user") -> str:
    a = build_agent(model, profile)
    out = a.invoke({"messages": [{"role": "user", "content": goal}]})
    return str(out["messages"][-1].content)