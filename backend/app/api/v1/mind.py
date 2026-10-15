"""Rotta Deep Agent `/mind` — T0b.

Rotta separata/dedicata per il motore portato in T0a. NON ancora esposta alla UI:
serve solo per testare il motore via curl/HTTP in isolamento.
Sicurezza: in questa tranche vengono esposti SOLO i profili `user` (mai dev);
le azioni sensibili (scrivi_output) passano da HITL se `interrupt_on` è attivo.
"""

import os
import uuid

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

# NOTA (punto 2, 15/10): i motori deep_agent (deepagents/langchain) sono PESANTI
# e vengono importati LAZY dentro le funzioni, NON qui a livello di modulo:
# importarli eager all'avvio di app.main rallenta lo startup del sidecar
# (misurato: ~2.5s solo per app.main). Si caricano solo al primo uso di /mind/*.

router = APIRouter(prefix="/mind", tags=["mind"], responses={401: {"description": "Non autenticato"}})

# T0c: sicurezza per costruzione — soltanto il profilo `user` è esposto via HTTP in
# questa fase. Eventuali profili dev (git, log, API, issue) NON esistono nella tool
# list del profilo user, quindi l'LLM non può nemmeno provare a chiamarli.
_ALLOWED_PROFILES = {"user"}


class ChatReq(BaseModel):
    goal: str
    profile: str = "user"
    model: str | None = None
    history: list[dict] = []


class ApproveReq(BaseModel):
    thread_id: str
    approve: bool


@router.get(
    "/health",
    summary="Healthcheck motore Deep Agent",
    description="Non richiede LLM né modelli. Ritorna stato, motore e profilo di default.",
)
async def health():
    """Healthcheck del motore Deep Agent — non richiede LLM né modelli."""
    return {"status": "ok", "engine": "deep_agent", "profile": "user"}


@router.get(
    "/skills",
    summary="Skills (tool) esposte dall'agente",
    description="Elenca le capacità (tools) dell'agente per il profilo user. Utile a consumatori esterni per scoprire cosa può fare il Deep Agent.",
)
async def skills():
    """Elenca le skills/tool dell'agente (profilo user).

    Riporta applicazione, tool, chat (streaming, task, HITL), config e RAG.
    I tool sono le stesse funzioni che l'LLM può chiamare (vedi tools/profile).
    """
    from app.deep_agent.tools.profile import get_tools

    tool_names = [getattr(t, "__name__", str(t)) for t in get_tools("user")]
    return {
        "engine": "deep_agent",
        "profile": "user",
        "tools": tool_names,
        "capabilities": {
            "chat": {"streaming": True, "tasks": True, "hitl": True},
            "config": {"provider": True, "model": True, "rag": True, "api_key_local": True},
            "rag": True,
        },
    }


@router.get(
    "/config",
    summary="Config Deep Agent (senza chiavi)",
    description="Provider, modello, workspace, RAG e streaming. Le chiavi non sono mai esposte.",
)
async def config():
    """Config Deep Agent (senza chiavi): provider, modello, workspace, RAG, streaming."""
    from app.deep_agent.config import load as config_load, public as config_public

    return config_public(config_load())


class ConfigUpdate(BaseModel):
    """Aggiornamento della config Deep Agent (T3a + punto 7 multi-provider).

    `api_key` resta locale, mai restituita in GET. Un campo assente non viene
    modificato; una stringa vuota elimina la chiave.

    `providers` (punto 7): lista ORDINATA di provider (indice 0 = massima
    priorità). Ogni voce: {"provider", "model", "api_key", "enabled"}. Se
    presente, sostituisce la lista esistente.
    """

    provider: str | None = Field(default=None, description="ollama|anthropic|openai|openrouter|huggingface (selezione attiva)")
    model: str | None = None
    workspace: str | None = None
    rag_enabled: bool | None = None
    streaming: bool | None = None
    api_key: str | None = None
    # punto 7
    providers: list[dict] | None = None
    fallback_enabled: bool | None = None


@router.put(
    "/config",
    summary="Aggiorna config Deep Agent",
    description="Salva in locale provider/modello/workspace/RAG/chiave + lista provider con precedenza e fallback. Le chiavi restano locali, mai restituite in GET.",
)
async def put_config(req: ConfigUpdate):
    """Salva la config in locale. Le chiavi non sono mai esposte nel GET."""
    from app.deep_agent.config import load as config_load, public as config_public, save as config_save

    cfg = req.model_dump(exclude_none=True)
    config_save(cfg)
    return config_public(config_load())


@router.get(
    "/ollama/models",
    summary="Elenco modelli Ollama locali",
    description="Riporta i modelli scaricati sull'Ollama locale (punto 8: listino, non input libero).",
)
async def ollama_models():
    """Elenco modelli Ollama scaricati sulla macchina."""
    base_url = os.environ.get("PDFMIND_OLLAMA_URL", "http://localhost:11434")
    try:
        import httpx
        async with httpx.AsyncClient(timeout=4) as client:
            r = await client.get(f"{base_url}/api/tags")
        if r.status_code != 200:
            return {"models": [], "ok": False, "message": f"Ollama non raggiungibile ({r.status_code})"}
        data = r.json()
        names = [m.get("name", "") for m in data.get("models", []) if m.get("name")]
        return {"models": names, "ok": True}
    except Exception as e:  # noqa: BLE001
        return {"models": [], "ok": False, "message": f"Errore: {type(e).__name__}"}


class TestReq(BaseModel):
    provider: str | None = None
    model: str | None = None


@router.post(
    "/test",
    summary="Prova connessione al provider",
    description="Verifica che il provider configurato (con la key salvata) sia raggiungibile (punto 10).",
)
async def test_connection(req: TestReq):
    """Prova connessione al provider Deep Agent configurato."""
    from app.deep_agent.config import load as config_load

    cfg = config_load()
    provider = req.provider or cfg.get("provider", "ollama")
    model = req.model or cfg.get("model", "")
    if provider == "ollama":
        base_url = os.environ.get("PDFMIND_OLLAMA_URL", "http://localhost:11434")
        try:
            import httpx
            async with httpx.AsyncClient(timeout=4) as client:
                r = await client.get(f"{base_url}/api/tags")
            if r.status_code != 200:
                return {"ok": False, "message": "Ollama non raggiungibile"}
            return {"ok": True, "message": "Ollama raggiungibile ✓"}
        except Exception as e:  # noqa: BLE001
            return {"ok": False, "message": f"Ollama non raggiungibile: {type(e).__name__}"}
    # Provider cloud: verifica solo che ci sia una key configurata (non facciamo
    # chiamate che costano; il test reale avviene al primo uso in chat).
    env_key = {
        "anthropic": "PDFMIND_ANTHROPIC_API_KEY",
        "openai": "PDFMIND_OPENAI_API_KEY",
        "openrouter": "PDFMIND_OPENROUTER_API_KEY",
        "huggingface": "PDFMIND_HF_API_KEY",
    }.get(provider)
    has_key = bool(env_key and os.environ.get(env_key)) or bool(cfg.get("api_key"))
    if not has_key:
        return {"ok": False, "message": "Nessuna chiave API configurata per questo provider"}
    if not model:
        return {"ok": False, "message": "Nessun modello configurato"}
    return {"ok": True, "message": f"Configurazione {provider} completa ({model})"}


@router.post(
    "/chat",
    summary="Conversazione con il Deep Agent (streaming SSE)",
    description="Avvia una conversazione in streaming (text/event-stream). Eventi: [THREAD], [TASK], [STEP], testo, [HITL], [DONE]. Solo profilo user (mai dev).",
)
async def chat(req: ChatReq):
    """Avvia una conversazione col Deep Agent in streaming (SSE).

    Il profilo è forzato a `user` in questa fase: RAG e tools dev sono fuori scope.
    """
    from app.deep_agent.agents.pdfmind import build_agent
    from app.deep_agent.server.mind import _events

    profile = (
        req.profile if req.profile in _ALLOWED_PROFILES else "user"
    )  # T0c: profilo non consentito => fallback sicuro a user (mai dev)
    if req.profile not in _ALLOWED_PROFILES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"profilo non consentito: {req.profile!r}. Sono ammessi solo: {sorted(_ALLOWED_PROFILES)}",
        )
    agent = build_agent(req.model, profile)
    return StreamingResponse(
        _events(agent, req.goal, uuid.uuid4().hex, req.history),
        media_type="text/event-stream",
    )


@router.post(
    "/approve",
    summary="Riprende stream HITL (approva/rifiuta)",
    description="Conferma o rifiuta un'azione in attesa di approvazione (HITL) e riprende lo stream.",
)
async def approve(req: ApproveReq):
    """Riprende uno stream interrotto da HITL con approvazione/rifiuto."""
    from fastapi.responses import JSONResponse

    from app.deep_agent.server.mind import _resume_events, SESSIONS

    if req.thread_id not in SESSIONS:
        return JSONResponse({"error": "sessione non trovata"}, status_code=404)
    decision = {"type": "approve" if req.approve else "reject"}
    return StreamingResponse(
        _resume_events(req.thread_id, decision),
        media_type="text/event-stream",
    )
