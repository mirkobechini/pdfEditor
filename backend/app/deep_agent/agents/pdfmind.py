import os

from deepagents import create_deep_agent
from langchain.agents.middleware import TodoListMiddleware
from langchain_openai import ChatOpenAI
from langchain_ollama import ChatOllama
from langgraph.checkpoint.memory import MemorySaver

from app.deep_agent.tools.docs import (confronta_versioni, elenca_file, estrai_date, leggi_pdf, riassumi_pdf)  # noqa: E501
from app.deep_agent.tools.profile import get_tools

DEF_MODEL = "ollama:qwen3.5"



def _resolve_model(m: str):
    if m.startswith("ollama:"):
        name = m.split(":", 1)[1]
        return ChatOllama(
            model=name,
            base_url=os.environ.get("PDFMIND_OLLAMA_URL", "http://localhost:11434"),
            reasoning=False,
        )
    if m.startswith("openai:"):
        name = m.split(":", 1)[1]
        return ChatOpenAI(
            model=name,
            base_url=os.environ.get("PDFMIND_OPENAI_BASE_URL", "https://api.openai.com/v1"),
            api_key=os.environ.get("PDFMIND_OPENAI_API_KEY", ""),
        )
    return m


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
    return create_deep_agent(
        model=_resolve_model(m),
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