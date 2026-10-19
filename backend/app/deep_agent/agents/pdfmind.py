import os

from deepagents import create_deep_agent
from langchain.agents.middleware import TodoListMiddleware
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_ollama import ChatOllama
from langgraph.checkpoint.memory import MemorySaver

from app.deep_agent.config import ordered_providers, fallback_enabled
from app.deep_agent.tools.docs import (confronta_versioni, elenca_file, estrai_date, leggi_pdf, riassumi_pdf)  # noqa: E501
from app.deep_agent.tools.profile import get_tools

DEF_MODEL = "ollama:qwen3.5"

# Provider supportati dal resolver.
SUPPORTED_PREFIXES = ("ollama:", "anthropic:", "openai:", "openrouter:", "huggingface:")


def _resolve_model(m: str):
    if m.startswith("ollama:"):
        name = m.split(":", 1)[1]
        return ChatOllama(
            model=name,
            base_url=os.environ.get("PDFMIND_OLLAMA_URL", "http://localhost:11434"),
            reasoning=False,
        )
    if m.startswith("anthropic:"):
        name = m.split(":", 1)[1]
        return ChatAnthropic(
            model=name,
            api_key=os.environ.get("PDFMIND_ANTHROPIC_API_KEY", ""),
            base_url=os.environ.get("PDFMIND_ANTHROPIC_BASE_URL") or None,
        )
    if m.startswith("openrouter:"):
        name = m.split(":", 1)[1]
        return ChatOpenAI(
            model=name,
            base_url=os.environ.get("PDFMIND_OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
            api_key=os.environ.get("PDFMIND_OPENROUTER_API_KEY", ""),
        )
    if m.startswith("huggingface:"):
        # Hugging Face Inference è OpenAI-compatible: riusiamo ChatOpenAI col suo endpoint.
        name = m.split(":", 1)[1]
        return ChatOpenAI(
            model=name,
            base_url=os.environ.get("PDFMIND_HF_BASE_URL", "https://api-inference.huggingface.co/v1"),
            api_key=os.environ.get("PDFMIND_HF_API_KEY", ""),
        )
    if m.startswith("openai:"):
        name = m.split(":", 1)[1]
        return ChatOpenAI(
            model=name,
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
    "Usa SEMPRE il nome del file esattamente come lo ha scritto l'utente, senza correggerlo "
    "(non cambiare underscore/trattini/maiuscole/estensione). Se il nome indicato dall'utente "
    "non corrisponde esattamente a un file esistente, NON indovinare e NON correggerlo da solo: "
    "chiedi all'utente conferma indicando il nome reale del file presente nel workspace. "
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
    "Rispondi in italiano, con frasi brevi e naturali, confermando solo il risultato."
)


INTERRUPT_ON = {
    "scrivi_output": True,
    "write_file": True,
    "edit_file": True,
    "delete": True,
}


def build_agent(model: str | None = None, profile: str = "user"):
    m = model or os.environ.get("PDFMIND_MODEL", DEF_MODEL)
    effective_model = resolve_primary_model() if (model is None and not os.environ.get("PDFMIND_MODEL")) else _resolve_model(m)
    return create_deep_agent(
        model=effective_model,
        tools=get_tools(profile),
        middleware=[TodoListMiddleware()],
        subagents=[DOCS_ANALYST],
        interrupt_on=INTERRUPT_ON,
        checkpointer=MemorySaver(),
        system_prompt=SYSTEM_PROMPT,
    )


def run_goal(goal: str, model: str | None = None, profile: str = "user") -> str:
    a = build_agent(model, profile)
    out = a.invoke({"messages": [{"role": "user", "content": goal}]})
    return str(out["messages"][-1].content)