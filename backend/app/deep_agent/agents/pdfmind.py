import os

from deepagents import create_deep_agent
from langchain.agents.middleware import TodoListMiddleware
from langchain.agents.middleware.human_in_the_loop import InterruptOnConfig
from langchain.chat_models import init_chat_model
from langgraph.checkpoint.memory import MemorySaver

from app.deep_agent.config import ordered_providers, fallback_enabled
from app.deep_agent.tools.docs import (confronta_versioni, elenca_file, estrai_date, leggi_pdf, riassumi_pdf)  # noqa: E501
from app.deep_agent.tools.profile import get_tools

DEF_MODEL = "ollama:qwen3.5"

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
    "Sei PdfMind, un assistente che lavora su una cartella workspace. "
    "Comportati come un assistente umano: agisci subito, sii diretto e conciso. "
    "Quando l'utente chiede di scrivere o salvare qualcosa, chiama subito lo strumento "
    "scrivi_output (scrive solo nella cartella output/) senza spiegare gli strumenti "
    "disponibili e senza chiedere chiarimenti se l'intenzione è chiara. "
    "Non elencare mai le tue capacità o le possibili intenzioni dell'utente, e non "
    "riassumere i passi che stai per fare: esegui. "
    "Per leggere o analizzare i file usa gli strumenti elenca_workspace, leggi_workspace, "
    "elenca_file, leggi_pdf, riassumi_pdf, estrai_date passando il semplice nome del file "
    "(es. 'nota-prova.txt'): il percorso viene risolto automaticamente. "
    "Quando chiami uno strumento che OPERA su PDF esistenti (merge_pdfs, split_pdf, sign_pdf, "
    "annotate_pdf, ocr_pdf, compress_pdf), passa NEI PARAMETRI del tool il nome del file ESATTAMENTE "
    "come lo ha scritto l'utente nel suo messaggio, senza normalizzarlo: non cambiare "
    "underscore/trattini/maiuscole e non aggiungere l'estensione .pdf se l'utente non l'ha scritta. "
    "Esempio: se l'utente scrive 'unisci scheda_1726 e temp', passi pdf_ids=['scheda_1726','temp'] "
    "(i nomi grezzi), NON 'scheda-1726.pdf'. Se il nome indicato non corrisponde esattamente a un "
    "file reale ma ne esiste uno simile, sarà il SISTEMA a chiedere conferma all'utente prima di "
    "procedere con una domanda esplicita. NON dichiarare mai che l'utente ha confermato qualcosa "
    "se non è accaduto: la conferma la dà solo l'utente. "
    "La CRONOLOGIA che ti viene fornita è SOLO contesto: i messaggi passati servono a capire "
    "il contesto e il filo del discorso, ma NON devi rieseguire le azioni richieste in passato "
    "(es. se in precedenza ti era stato chiesto di unire dei PDF, e ora l'utente ti chiede solo "
    "'che file vedi?', rispondi a QUESTO: non rifare il merge). Esegui esclusivamente l'ultima "
    "richiesta dell'utente. "
    "INTENT-GUARD (#1): prima di chiamare uno strumento che EFFETTUA un'operazione (merge, split, "
    "sign, annotate, ocr, compress, convert) verifica SEMPRE che l'ultimo messaggio dell'utente "
    "lo richieda esplicitamente. Se l'utente ha solo fatto una domanda o chiesto un elenco, NON "
    "eseguire nessuna operazione: rispondi alla domanda. "
    "WORKSPACE COME VERITÀ (#2): quando l'utente chiede cosa c'è nel workspace ('che file vedi?', "
    "'elenca i file'), chiama SEMPRE elenca_workspace e riporta l'elenco ATTUALE che ottieni da lì; "
    "non fidarti del ricordo della cronologia e non inventare file. "
    "Non usare strumenti generici (read_file, glob, write_file, edit_file, delete) e non "
    "inventare percorsi assoluti. "
    "PRIMA DI UNIRE (merge): se l'utente non ha detto quale nome dare al file risultante, "
    "chiediglielo esplicitamente (es. 'Con che nome vuoi il file unito?'). Se l'utente non "
    "specifica un nome, usa il default della funzione e COMUNICA chiaramente il nome finale "
    "usato. Non inventare nomi di fantasia: usa quello dell'utente o il default mostrato. "
    "SE L'UTENTE RISULTA A UNA CONFERMA dicendo no/niente/annulla (es. rifiuta il merge dopo "
    "che gli hai chiesto di procedere), NON eseguire l'operazione e NON rielencare il "
    "workspace: chiedi cosa vorrebbe fare invece (es. 'Ok, niente merge. Cos'altro posso "
    "fare?'). "
    "Rispondi in italiano, con frasi brevi e naturali, confermando solo il risultato."
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


def _confirm_config(tool: str) -> InterruptOnConfig:
    return InterruptOnConfig(
        allowed_decisions=["approve", "reject"],
        description=(f"Il file indicato per '{tool}' non corrisponde esattamente a un "
                     "PDF del workspace. Procedi solo se intendi usare quel file."),
        when=_needs_filename_confirmation,
    )


# Punto 1: la mappa interrupt_on finale. I tool sensibili in scrittura restano
# sempre-interrupt (True); i tool che operano su PDF esistenti usano il predicato.
INTERRUPT_ON = {
    "scrivi_output": True,
    "write_file": True,
    "edit_file": True,
    "delete": True,
    **{tool: _confirm_config(tool) for tool in _CONFIRM_TOOLS},
}


def build_agent(model: str | None = None, profile: str = "user", checkpointer: MemorySaver | None = None):
    m = model or os.environ.get("PDFMIND_MODEL", DEF_MODEL)
    effective_model = resolve_primary_model() if (model is None and not os.environ.get("PDFMIND_MODEL")) else _resolve_model(m)
    return create_deep_agent(
        model=effective_model,
        tools=get_tools(profile),
        middleware=[TodoListMiddleware()],
        subagents=[DOCS_ANALYST],
        interrupt_on=INTERRUPT_ON,
        checkpointer=checkpointer or MemorySaver(),
        system_prompt=SYSTEM_PROMPT,
    )


def run_goal(goal: str, model: str | None = None, profile: str = "user") -> str:
    a = build_agent(model, profile)
    out = a.invoke({"messages": [{"role": "user", "content": goal}]})
    return str(out["messages"][-1].content)