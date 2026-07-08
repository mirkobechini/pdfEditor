from collections.abc import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db as _get_db
from app.models.user import User
from app.repositories.user_repo import UserRepository
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


def verify_feature_access(feature_key: str):
    """Dependency factory: check that the current user's license tier
    enables the given feature_key. Admin users bypass all checks."""

    def _check(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        check_feature_access(current_user, db, feature_key)
        return current_user

    return _check


def check_feature_access(
    current_user: User, db: Session, feature_key: str
) -> None:
    """Shared helper: raise HTTPException 403 if the user's license tier
    does not enable the given feature_key. Admin users bypass all checks.

    When settings.DISABLE_LICENSE_ENFORCEMENT is True, all checks are bypassed
    and all features are available to all users."""
    if settings.DISABLE_LICENSE_ENFORCEMENT:
        return

    if current_user.is_admin:
        return

    repo = UserRepository(db)
    features = repo.get_features_for_tier(current_user.license_tier)
    enabled_keys = {f.feature_key for f in features if f.enabled}

    if feature_key not in enabled_keys:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"License tier '{current_user.license_tier}' does not "
                f"include '{feature_key}'. Upgrade to access this feature."
            ),
        )