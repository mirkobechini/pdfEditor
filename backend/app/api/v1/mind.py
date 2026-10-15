"""Rotta Deep Agent `/mind` — T0b.

Rotta separata/dedicata per il motore portato in T0a. NON ancora esposta alla UI:
serve solo per testare il motore via curl/HTTP in isolamento.
Sicurezza: in questa tranche vengono esposti SOLO i profili `user` (mai dev);
le azioni sensibili (scrivi_output) passano da HITL se `interrupt_on` è attivo.
"""

import uuid

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.deep_agent.agents.pdfmind import build_agent
from app.deep_agent.server.mind import _events, _resume_events

router = APIRouter(prefix="/mind", tags=["mind"])

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


@router.get("/health")
async def health():
    """Healthcheck del motore Deep Agent — non richiede LLM né modelli."""
    return {"status": "ok", "engine": "deep_agent", "profile": "user"}


@router.get("/config")
async def config():
    """Config minima esposta dal motore (profilo di default user)."""
    return {"profile": "user", "rag": False, "streaming": True}


@router.post("/chat")
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


@router.post("/approve")
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
