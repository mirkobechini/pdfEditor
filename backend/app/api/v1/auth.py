from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse, RedirectResponse, HTMLResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
import httpx

from app.api.deps import get_db
from app.core.config import settings
from app.core.limiter import limiter
from app.core.security import create_access_token
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    GoogleLoginRequest,
    GuestConvertRequest,
    GuestTokenResponse,
    ResetPasswordRequest,
    SyncUserRequest,
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
    set_csrf_cookie(response, csrf_token, request=request)
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
        err_msg = str(e)
        if err_msg == "EMAIL_NOT_FOUND":
            raise error_response(ErrorCode.EMAIL_NOT_FOUND, "Email not registered", status.HTTP_401_UNAUTHORIZED)
        if err_msg == "WRONG_PASSWORD":
            raise error_response(ErrorCode.WRONG_PASSWORD, "Wrong password", status.HTTP_401_UNAUTHORIZED)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )

    csrf_token = generate_csrf_token()
    response = JSONResponse(
        content=TokenResponse(access_token=token, csrf_token=csrf_token).model_dump(mode="json"),
    )
    _set_token_cookie(response, token)
    set_csrf_cookie(response, csrf_token, request=request)
    return response


@router.post("/guest", response_model=GuestTokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/hour")
def guest_login(
    request: Request,
    service: AuthService = Depends(get_auth_service),
) -> GuestTokenResponse:
    """Create a temporary guest account. No credentials needed."""
    user, token = service.create_guest_user()
    csrf_token = generate_csrf_token()
    response = JSONResponse(
        content=GuestTokenResponse(
            access_token=token,
            csrf_token=csrf_token,
            user=UserResponse.model_validate(user),
        ).model_dump(mode="json"),
        status_code=status.HTTP_201_CREATED,
    )
    _set_token_cookie(response, token)
    set_csrf_cookie(response, csrf_token, request=request)
    return response


@router.post("/guest/convert", response_model=TokenResponse)
def convert_guest(
    req: GuestConvertRequest,
    request: Request,
    db: Session = Depends(get_db),
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    """Convert guest account to full registration."""
    token = _get_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    try:
        user = service.get_current_user(token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )

    try:
        service.convert_guest(user, email=req.email, password=req.password, full_name=req.full_name)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # Re-login to get new token with same user
    new_token = create_access_token(data={"sub": user.id})
    csrf_token = generate_csrf_token()
    response = JSONResponse(
        content=TokenResponse(access_token=new_token, csrf_token=csrf_token).model_dump(mode="json"),
    )
    _set_token_cookie(response, new_token)
    set_csrf_cookie(response, csrf_token, request=request)
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
    set_csrf_cookie(response, csrf_token, request=request)
    return response


# In-memory store for desktop Google OAuth token.
# Key: state param (random string). Value: {"token": str, "used": bool}
_desktop_oauth_store: dict[str, dict] = {}


@router.get("/google/desktop-login")
def google_desktop_login(request: Request):
    """Redirect to Google OAuth consent screen for desktop app.

    Opens in the system browser (via @tauri-apps/plugin-opener).
    After login, Google redirects to /google/desktop-callback.
    """
    import secrets
    state = secrets.token_urlsafe(32)
    redirect_uri = f"{request.base_url}auth/google/desktop-callback"

    # Store state for later verification
    _desktop_oauth_store[state] = {"used": False, "token": None}

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "select_account",
    }
    from urllib.parse import urlencode
    google_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return RedirectResponse(url=google_url)


@router.get("/google/desktop-callback")
async def google_desktop_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    """Handle Google OAuth callback for desktop app.

    Exchanges the authorization code for tokens, creates/authenticates the user,
    and redirects the system browser to the sidecar URL with the JWT token.
    """
    if error:
        return RedirectResponse(
            url=f"http://127.0.0.1:7723/auth/desktop-token-receive?error={error}"
        )

    if not code or not state:
        return RedirectResponse(
            url="http://127.0.0.1:7723/auth/desktop-token-receive?error=missing_params"
        )

    # Verify state
    stored = _desktop_oauth_store.pop(state, None)
    if not stored:
        return RedirectResponse(
            url="http://127.0.0.1:7723/auth/desktop-token-receive?error=invalid_state"
        )

    # Exchange code for tokens
    token_url = "https://oauth2.googleapis.com/token"
    redirect_uri = f"{request.base_url}auth/google/desktop-callback"
    data = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(token_url, data=data)
        if resp.status_code != 200:
            return RedirectResponse(
                url="http://127.0.0.1:7723/auth/desktop-token-receive?error=token_exchange_failed"
            )
        tokens = resp.json()
        id_token_str = tokens.get("id_token")

    if not id_token_str:
        return RedirectResponse(
            url="http://127.0.0.1:7723/auth/desktop-token-receive?error=no_id_token"
        )

    # Authenticate with Google
    service = AuthService(db)
    try:
        _, jwt_token = service.google_login(id_token_str)
    except ValueError as e:
        return RedirectResponse(
            url=f"http://127.0.0.1:7723/auth/desktop-token-receive?error={str(e)}"
        )

    # Redirect to sidecar with the JWT token
    sidecar_url = f"http://127.0.0.1:7723/auth/google/desktop-token-receive?token={jwt_token}"
    return RedirectResponse(url=sidecar_url)


# In-memory token for desktop Google OAuth (set by sidecar endpoint)
_desktop_oauth_token: str | None = None


@router.get("/desktop-token-receive")
def google_desktop_token_receive(
    token: str | None = None,
    error: str | None = None,
):
    """Handle token from Google OAuth on the local sidecar.

    This endpoint is called by the browser redirect after successful Google login.
    The token is stored in memory for the frontend to poll.
    """
    global _desktop_oauth_token
    if error:
        return HTMLResponse(
            content=f"<html><body><h2>Google login failed</h2><p>{error}</p>"
            "<p>Chiudi questa finestra e riprova.</p></body></html>"
        )

    if not token:
        return HTMLResponse(
            content="<html><body><h2>Token mancante</h2>"
            "<p>Chiudi questa finestra e riprova.</p></body></html>"
        )

    _desktop_oauth_token = token

    return HTMLResponse(
        content="<html><body><h2>Login con Google riuscito!</h2>"
        "<p>Puoi chiudere questa finestra e tornare all'app.</p>"
        "<script>window.close();</script></body></html>"
    )


@router.get("/desktop-token")
def get_desktop_token():
    """Return the Google OAuth token if available (polled by frontend)."""
    global _desktop_oauth_token
    token = _desktop_oauth_token
    if token:
        _desktop_oauth_token = None  # Consume it
        return {"access_token": token}
    return {"access_token": None}


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
    set_csrf_cookie(response, csrf_token, request=request)
    return response


@router.post("/sync", status_code=status.HTTP_200_OK)
def sync_user(
    req: SyncUserRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    """Sync a cloud user into the local sidecar database.

    This allows the desktop sidecar to recognise the user for getMe
    and CSRF requests without needing the cloud's JWT secret key.
    A new local JWT is issued and a CSRF token is set.
    """

    from datetime import datetime, timezone

    repo = UserRepository(db)

    # Upsert user by id (matching cloud user id)
    user = repo.get_by_id(req.id)
    if user:
        # Update existing
        user.email = req.email
        user.full_name = req.full_name
        user.is_active = req.is_active
        user.is_admin = req.is_admin
        user.is_guest = req.is_guest
        user.license_tier = req.license_tier
        user.license_tier_source = req.license_tier_source
        user.google_id = req.google_id
        if req.created_at:
            user.created_at = req.created_at
        user.updated_at = req.updated_at or datetime.now(timezone.utc)
        repo.update(user)
    else:
        # Create new
        user = User(
            id=req.id,
            email=req.email,
            full_name=req.full_name,
            is_active=req.is_active,
            is_admin=req.is_admin,
            is_guest=req.is_guest,
            license_tier=req.license_tier,
            license_tier_source=req.license_tier_source,
            google_id=req.google_id,
            hashed_password="",  # password managed on cloud, not stored locally
            created_at=req.created_at or datetime.now(timezone.utc),
            updated_at=req.updated_at or datetime.now(timezone.utc),
        )
        repo.create(user)

    # Issue a local JWT so getMe and refreshCsrf work
    local_token = create_access_token(data={"sub": user.id})

    csrf_token = generate_csrf_token()
    response = JSONResponse(
        content={
            "access_token": local_token,
            "token_type": "bearer",
            "csrf_token": csrf_token,
        }
    )
    _set_token_cookie(response, local_token)
    set_csrf_cookie(response, csrf_token, request=request)
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
    try:
        EmailService.send_password_reset_email(req.email, token)
    except ValueError as e:
        raise error_response(ErrorCode.EMAIL_QUOTA_EXCEEDED, str(e), status_code=status.HTTP_429_TOO_MANY_REQUESTS)
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


@router.post("/offline-token")
def offline_token(
    request: Request,
    service: AuthService = Depends(get_auth_service),
) -> dict:
    """Generate a long-lived offline token for the desktop app.
    
    Requires a valid session (JWT cookie or Bearer token).
    The returned token expires in OFFLINE_TOKEN_EXPIRE_DAYS (default 30).
    """
    token = _get_token(request)
    if not token:
        raise error_response(
            ErrorCode.INVALID_CREDENTIALS,
            "Authentication required",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
    try:
        user = service.get_current_user(token)
    except ValueError as e:
        raise error_response(
            ErrorCode.INVALID_CREDENTIALS,
            str(e),
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    from datetime import timedelta
    from app.core.security import create_access_token

    offline_token = create_access_token(
        data={"sub": user.id, "type": "offline"},
        expires_delta=timedelta(days=settings.OFFLINE_TOKEN_EXPIRE_DAYS),
    )
    return {"offline_token": offline_token, "expires_in_days": settings.OFFLINE_TOKEN_EXPIRE_DAYS}