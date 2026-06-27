from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.repositories.user_repo import UserRepository
from app.schemas.auth import LicenseFeatureResponse, UpdateAdminRequest, UpdateLicenseRequest, UserResponse

router = APIRouter(tags=["admin"])

VALID_TIERS = {"free", "pro", "enterprise"}


@router.get("/admin/users", response_model=list[UserResponse])
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[UserResponse]:
    """List all users (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    repo = UserRepository(db)
    users = repo.get_all_users(skip=skip, limit=limit)
    return [UserResponse.model_validate(u) for u in users]


@router.put("/admin/users/{user_id}/license", response_model=UserResponse)
def update_user_license(
    user_id: str,
    req: UpdateLicenseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    """Update a user's license tier (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    if req.license_tier not in VALID_TIERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid tier '{req.license_tier}'. Valid: {', '.join(sorted(VALID_TIERS))}",
        )

    repo = UserRepository(db)
    user = repo.update_license_tier(user_id, req.license_tier)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return UserResponse.model_validate(user)


@router.put("/admin/users/{user_id}/admin", response_model=UserResponse)
def update_user_admin(
    user_id: str,
    req: UpdateAdminRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    """Promote or demote a user to/from admin (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    repo = UserRepository(db)
    try:
        user = repo.update_is_admin(user_id, req.is_admin)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return UserResponse.model_validate(user)


@router.get("/licenses/features", response_model=list[LicenseFeatureResponse])
def get_license_features(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[LicenseFeatureResponse]:
    """Get features enabled for current user's license tier."""
    repo = UserRepository(db)
    features = repo.get_features_for_tier(current_user.license_tier)
    return [LicenseFeatureResponse.model_validate(f) for f in features]