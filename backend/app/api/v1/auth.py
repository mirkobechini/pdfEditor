from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
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
    UnlinkGoogleRequest,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
    UserUpdateRequest,
)
from app.services.auth_service import AuthService
from app.services.email_service import EmailService
from app.repositories.user_repo import UserRepository
from app.core.errors import error_response, ErrorCode
from app.core.csrf import generate_csrf_token, set_csrf_cookie

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


def _set_token_cookie(response: Response, token: str) -> None:
    """Set JWT token as httpOnly cookie.
    
    Uses samesite='none' + secure=True in production so the cookie
    is sent on cross-origin requests (Cloudflare -> Render).
    Falls back to samesite='lax' in local dev (no HTTPS).
    """
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="none" if not settings.DEBUG else "lax",
        secure=not settings.DEBUG,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )


def _clear_token_cookie(response: Response) -> None:
    """Clear JWT cookie on logout."""
    response.set_cookie(
        key="access_token",
        value="",
        httponly=True,
        samesite="none" if not settings.DEBUG else "lax",
        secure=not settings.DEBUG,
        max_age=0,
        path="/",
    )


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(db)


def _get_token(request: Request) -> str | None:
    """Extract JWT token from cookie or Authorization header (backward compat)."""
    # Try cookie first
    token = request.cookies.get("access_token")
    if token:
        return token
    # Fall back to Authorization header
    auth = request.headers.get("Authorization")
    if auth and auth.startswith("Bearer "):
        return auth[7:]
    return None


@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("3/hour")
def register(
    req: UserRegisterRequest,
    request: Request,
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    """Register a new user. Auto-login sets httpOnly cookie and returns JWT."""
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

    # Auto-login after registration
    token = service.login(email=req.email, password=req.password)
    csrf_token = generate_csrf_token()
    response = JSONResponse(
        content=TokenResponse(access_token=token, csrf_token=csrf_token).model_dump(mode="json"),
        status_code=status.HTTP_201_CREATED,
    )
    _set_token_cookie(response, token)
    set_csrf_cookie(response, csrf_token)
    return response


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(
    req: UserLoginRequest,
    request: Request,
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    """Login and get JWT token. Sets httpOnly cookie."""
    try:
        token = service.login(email=req.email, password=req.password)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )

    csrf_token = generate_csrf_token()
    response = JSONResponse(
        content=TokenResponse(access_token=token, csrf_token=csrf_token).model_dump(mode="json"),
    )
    _set_token_cookie(response, token)
    set_csrf_cookie(response, csrf_token)
    return response


@router.get("/me", response_model=UserResponse)
def get_me(
    request: Request,
    db: Session = Depends(get_db),
) -> UserResponse:
    """Get current user profile from JWT token (cookie or header)."""
    token = _get_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    service = AuthService(db)
    try:
        user = service.get_current_user(token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )

    return UserResponse.model_validate(user)


@router.put("/me", response_model=UserResponse)
def update_me(
    req: UserUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> UserResponse:
    """Update current user profile."""
    token = _get_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    service = AuthService(db)
    try:
        user = service.get_current_user(token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )

    if req.full_name is not None:
        user.full_name = req.full_name
        repo = UserRepository(db)
        repo.update(user)

    return UserResponse.model_validate(user)


@router.post("/google", response_model=TokenResponse)
@limiter.limit("5/minute")
def google_login(
    req: GoogleLoginRequest,
    request: Request,
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    """Login with Google SSO using an id_token. Sets httpOnly cookie."""
    try:
        user, token = service.google_login(req.id_token)
    except ValueError as e:
        raise error_response(
            ErrorCode.GOOGLE_AUTH_FAILED,
            str(e),
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    csrf_token = generate_csrf_token()
    response = JSONResponse(
        content=TokenResponse(access_token=token, csrf_token=csrf_token).model_dump(mode="json"),
    )
    _set_token_cookie(response, token)
    set_csrf_cookie(response, csrf_token)
    return response


@router.post("/unlink/google", response_model=UserResponse)
def unlink_google(
    req: UnlinkGoogleRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> UserResponse:
    """Unlink Google account from the current user.

    Requires password confirmation for security.
    """
    token = _get_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    service = AuthService(db)
    try:
        user = service.get_current_user(token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )

    # Verify password
    from app.core.security import verify_password
    if not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid password",
        )

    # Check if Google is actually linked
    if not user.google_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account is not linked",
        )

    # Unlink
    user.google_id = None
    repo = UserRepository(db)
    repo.update(user)

    return UserResponse.model_validate(user)


@router.get("/csrf")
def get_csrf_token(
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    """Return a fresh CSRF token in the response body.

    Cross-origin production: after page refresh the in-memory csrf_token
    is lost and document.cookie is unreadable. This endpoint lets the
    frontend re-sync the token on mount (called after getMe succeeds).
    """
    # Require authentication — no point refreshing CSRF for anonymous users
    token = _get_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    service = AuthService(db)
    try:
        service.get_current_user(token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )

    csrf_token = generate_csrf_token()
    response = JSONResponse(content={"csrf_token": csrf_token})
    set_csrf_cookie(response, csrf_token)
    return response


@router.post("/logout")
def logout():
    """Logout — clear the access_token cookie."""
    response = JSONResponse(content={"message": "Logged out"})
    _clear_token_cookie(response)
    return response


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("3/hour")
def forgot_password(
    req: ForgotPasswordRequest,
    request: Request,
    service: AuthService = Depends(get_auth_service),
):
    """Request a password reset. Returns 404 if email not found."""
    token = service.request_password_reset(req.email)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address.",
        )
    # Send reset email
    EmailService.send_password_reset_email(req.email, token)
    return {"message": "Password reset email sent. Check your inbox."}


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