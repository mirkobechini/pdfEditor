from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.repositories.user_repo import UserRepository
from app.schemas.auth import LicenseFeatureResponse, UpdateAdminRequest, UpdateLicenseRequest, UserResponse
from app.services.auth_service import AuthService
from app.services.email_service import EmailService

router = APIRouter(tags=["admin"])

VALID_TIERS = {"free", "pro", "enterprise"}
ADMIN_ASSIGNABLE_TIERS = {"free", "lifetime"}


class UserListResponse(BaseModel):
    """Response model for paginated user list."""

    items: list[UserResponse]
    total: int


@router.get("/admin/users", response_model=UserListResponse)
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserListResponse:
    """List all users (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    repo = UserRepository(db)
    users = repo.get_all_users(skip=skip, limit=limit)
    return UserListResponse(
        items=[UserResponse.model_validate(u) for u in users],
        total=len(users),
    )


@router.put("/admin/users/{user_id}/license", response_model=UserResponse)
def update_user_license(
    user_id: str,
    req: UpdateLicenseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    """Update a user's license tier (admin only).

    Restrictions:
    - Admin can only assign 'lifetime' or 'free' tiers.
    - Cannot modify Stripe-paid tiers ('pro', 'enterprise').
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    if req.license_tier not in ADMIN_ASSIGNABLE_TIERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Admin can only assign {', '.join(sorted(ADMIN_ASSIGNABLE_TIERS))} tiers. Got '{req.license_tier}'.",
        )

    repo = UserRepository(db)
    target = repo.get_by_id(user_id)
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Prevent modifying Stripe-paid tiers
    if target.license_tier_source == "stripe":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cannot modify Stripe-paid license tier '{target.license_tier}'. "
                   "User must cancel Stripe subscription first.",
        )

    user = repo.update_license_tier(user_id, req.license_tier)
    # Update source to admin since admin assigned it
    if user:
        user.license_tier_source = "admin"
        db.flush()
        db.refresh(user)

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


class SendResetResponse(BaseModel):
    message: str


@router.post("/admin/users/{user_id}/send-reset", response_model=SendResetResponse)
def admin_send_reset(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SendResetResponse:
    """Send a password reset email to a user (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    repo = UserRepository(db)
    target = repo.get_by_id(user_id)
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    service = AuthService(db)
    token = service.request_password_reset(target.email)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate reset token",
        )

    sent = EmailService.send_password_reset_email(target.email, token)
    if sent:
        return SendResetResponse(message=f"Reset email sent to {target.email}")
    else:
        return SendResetResponse(
            message=f"Dev mode: reset token generated for {target.email}. SMTP not configured."
        )