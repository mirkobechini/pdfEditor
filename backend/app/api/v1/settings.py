from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.repositories.preference_repo import PreferenceRepository
from app.repositories.user_repo import UserRepository
from app.core.security import decode_access_token

router = APIRouter(prefix="/settings", tags=["settings"])


class PreferenceResponse(BaseModel):
    theme: str
    language: str
    default_zoom: int
    antialiasing: bool
    density: str


class PreferenceUpdateRequest(BaseModel):
    theme: str | None = None
    language: str | None = None
    default_zoom: int | None = None
    antialiasing: bool | None = None
    density: str | None = None


def _get_user_id(request: Request) -> str:
    """Extract user_id from JWT token."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = auth[7:]
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    return user_id


@router.get("/", response_model=PreferenceResponse)
def get_preferences(
    request: Request,
    db: Session = Depends(get_db),
) -> PreferenceResponse:
    """Get user preferences. Returns defaults if none saved."""
    user_id = _get_user_id(request)
    repo = PreferenceRepository(db)
    pref = repo.get_by_user_id(user_id)
    if pref:
        return PreferenceResponse(
            theme=pref.theme,
            language=pref.language,
            default_zoom=pref.default_zoom,
            antialiasing=bool(pref.antialiasing),
            density=pref.density,
        )
    return PreferenceResponse(theme="dark", language="it", default_zoom=100, antialiasing=True, density="comfortable")


@router.put("/", response_model=PreferenceResponse)
def update_preferences(
    req: PreferenceUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> PreferenceResponse:
    """Update user preferences."""
    user_id = _get_user_id(request)
    repo = PreferenceRepository(db)
    pref = repo.upsert(
        user_id=user_id,
        theme=req.theme,
        language=req.language,
        default_zoom=req.default_zoom,
        antialiasing=req.antialiasing,
        density=req.density,
    )
    return PreferenceResponse(
        theme=pref.theme,
        language=pref.language,
        default_zoom=pref.default_zoom,
        antialiasing=bool(pref.antialiasing),
        density=pref.density,
    )