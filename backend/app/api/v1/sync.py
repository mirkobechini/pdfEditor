import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.v1.auth import _get_token
from app.core.errors import error_response, ErrorCode
from app.services.auth_service import AuthService
from app.services.sync_service import SyncService

logger = logging.getLogger("pdfeditor")

router = APIRouter(prefix="/sync", tags=["sync"])


class PushRequest(BaseModel):
    pdfs: list[dict[str, Any]]


def _get_auth_user(
    request: Request,
    db: Session = Depends(get_db),
) -> str:
    """Extract and validate the authenticated user from the request."""
    token = _get_token(request)
    if not token:
        raise error_response(
            ErrorCode.INVALID_CREDENTIALS,
            "Authentication required",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
    try:
        service = AuthService(db)
        user = service.get_current_user(token)
        return user.id
    except ValueError as e:
        raise error_response(
            ErrorCode.INVALID_CREDENTIALS,
            str(e),
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


@router.get("/status")
def sync_status(
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    """Get the last sync timestamp for the authenticated user."""
    user_id = _get_auth_user(request, db)
    service = SyncService(db)
    return service.get_status(user_id)


@router.post("/push")
def sync_push(
    body: PushRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    """Push local PDF records to the cloud."""
    user_id = _get_auth_user(request, db)
    service = SyncService(db)
    return service.push(user_id, body.pdfs)


@router.get("/pull")
def sync_pull(
    request: Request,
    since: str | None = None,
    db: Session = Depends(get_db),
) -> dict:
    """Pull PDF records updated after the given timestamp."""
    user_id = _get_auth_user(request, db)
    parsed_since = None
    if since:
        try:
            parsed_since = datetime.fromisoformat(since)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid since timestamp format")

    service = SyncService(db)
    return service.pull(user_id, parsed_since)