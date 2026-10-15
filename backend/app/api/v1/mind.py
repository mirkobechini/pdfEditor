"""Rotta Deep Agent `/mind` — T0b.

Rotta separata/dedicata per il motore portato in T0a. NON ancora esposta alla UI:
serve solo per testare il motore via curl/HTTP in isolamento.
Sicurezza: in questa tranche vengono esposti SOLO i profili `user` (mai dev);
le azioni sensibili (scrivi_output) passano da HITL se `interrupt_on` è attivo.
"""

import uuid

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.deep_agent.agents.pdfmind import build_agent
from app.deep_agent.config import load as config_load, public as config_public, save as config_save
from app.deep_agent.server.mind import _events, _resume_events
from app.deep_agent.tools.profile import get_tools

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
    return config_public(config_load())


class ConfigUpdate(BaseModel):
    """Aggiornamento della config Deep Agent (T3a).

    `api_key` resta locale, mai restituita in GET. Un campo assente non viene
    modificato; una stringa vuota elimina la chiave.
    """

    provider: str | None = Field(default=None, description="ollama|anthropic|openai|openrouter|huggingface")
    model: str | None = None
    workspace: str | None = None
    rag_enabled: bool | None = None
    streaming: bool | None = None
    api_key: str | None = None


@router.put(
    "/config",
    summary="Aggiorna config Deep Agent",
    description="Salva in locale provider/modello/workspace/RAG/chiave. Le chiavi restano locali, mai restituite in GET.",
)
async def put_config(req: ConfigUpdate):
    """Salva la config in locale. Le chiavi non sono mai esposte nel GET."""
    cfg = req.model_dump(exclude_none=True)
    config_save(cfg)
    return config_public(config_load())


@router.post(
    "/chat",
    summary="Conversazione con il Deep Agent (streaming SSE)",
    description="Avvia una conversazione in streaming (text/event-stream). Eventi: [THREAD], [TASK], [STEP], testo, [HITL], [DONE]. Solo profilo user (mai dev).",
)
async def chat(req: ChatReq):
    """Avvia una conversazione col Deep Agent in streaming (SSE).

    Il profilo è forzato a `user` in questa fase: RAG e tools dev sono fuori scope.
    """
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

    from app.deep_agent.server.mind import SESSIONS

    if req.thread_id not in SESSIONS:
        return JSONResponse({"error": "sessione non trovata"}, status_code=404)
    decision = {"type": "approve" if req.approve else "reject"}
    return StreamingResponse(
        _resume_events(req.thread_id, decision),
        media_type="text/event-stream",
    )
