from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.core.limiter import limiter
from app.schemas.auth import (
    ForgotPasswordRequest,
    GoogleLoginRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)
from app.services.auth_service import AuthService
from app.services.email_service import EmailService

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(db)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/hour")
def register(
    req: UserRegisterRequest,
    request: Request,
    service: AuthService = Depends(get_auth_service),
) -> UserResponse:
    """Register a new user."""
    try:
        user = service.register(
            email=req.email,
            password=req.password,
            full_name=req.full_name,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return UserResponse.model_validate(user)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(
    req: UserLoginRequest,
    request: Request,
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    """Login and get JWT token."""
    try:
        token = service.login(email=req.email, password=req.password)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )

    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
def get_me(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> UserResponse:
    """Get current user profile from JWT token."""
    service = AuthService(db)
    try:
        user = service.get_current_user(credentials.credentials)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )

    return UserResponse.model_validate(user)


@router.post("/google", response_model=TokenResponse)
@limiter.limit("5/minute")
def google_login(
    req: GoogleLoginRequest,
    request: Request,
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    """Login with Google SSO using an id_token."""
    try:
        user, token = service.google_login(req.id_token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )

    return TokenResponse(access_token=token)


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("3/hour")
def forgot_password(
    req: ForgotPasswordRequest,
    request: Request,
    service: AuthService = Depends(get_auth_service),
):
    """Request a password reset. Always returns 202 to avoid email enumeration."""
    token = service.request_password_reset(req.email)
    if token:
        # Send reset email
        EmailService.send_password_reset_email(req.email, token)
    return {"message": "If the email exists, the reset request has been received."}


@router.post("/reset-password", response_model=UserResponse)
def reset_password(
    req: ResetPasswordRequest,
    service: AuthService = Depends(get_auth_service),
) -> UserResponse:
    """Reset password using a valid reset token."""
    try:
        user = service.reset_password(token=req.token, new_password=req.new_password)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    return UserResponse.model_validate(user)