from collections.abc import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db as _get_db
from app.services.auth_service import AuthService
from app.services.pdf_service import PdfService

security = HTTPBearer()


def get_db() -> Generator[Session, None, None]:
    yield from _get_db()


def get_pdf_service(db: Session = Depends(get_db)) -> PdfService:
    return PdfService(db)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """Dependency: validate JWT and return current user."""
    service = AuthService(db)
    try:
        return service.get_current_user(credentials.credentials)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )