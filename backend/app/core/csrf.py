"""CSRF protection middleware."""

import secrets
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.config import settings
from app.core.security import decode_access_token


# Endpoints that don't require CSRF validation (auth, health)
CSRF_EXEMPT_PATHS = {
    "/auth/login",
    "/auth/register",
    "/auth/google",
    "/auth/logout",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/auth/guest",
    "/auth/guest/convert",
    "/auth/sync",
    # API v1 auth endpoints (for mobile compatibility)
    "/api/v1/auth/login",
    "/api/v1/auth/register", 
    "/api/v1/auth/google",
    "/api/v1/auth/logout",
    "/api/v1/auth/forgot-password",
    "/api/v1/auth/reset-password",
    "/api/v1/auth/guest",
    "/api/v1/auth/guest/convert",
    "/api/v1/auth/sync",
    "/health",
}


def generate_csrf_token() -> str:
    """Generate a cryptographically secure CSRF token."""
    return secrets.token_hex(32)


def set_csrf_cookie(response: Response, token: str | None = None, request: Request | None = None) -> str:
    """Set the csrf_token cookie on a response.

    If no token is provided, a new one is generated.
    Returns the token value (useful for testing).

    Uses SameSite=None on localhost connections (127.0.0.1, localhost)
    even without Secure, because Chrome/Edge allow this on localhost.
    This is required because the Tauri webview origin (http://tauri.localhost)
    is cross-site to the sidecar (http://127.0.0.1:7723) — with SameSite=Lax
    the browser would not send the cookie on cross-site POST requests.
    """
    if token is None:
        token = generate_csrf_token()

    # Localhost: SameSite=None without Secure (Chrome/Edge allow on localhost)
    # This lets cross-site POSTs from Tauri webview send the cookie.
    is_localhost = request is not None and (
        request.url.hostname in ("127.0.0.1", "localhost", "::1")
    )

    if is_localhost:
        response.set_cookie(
            key="csrf_token",
            value=token,
            httponly=False,
            samesite="none",
            secure=False,
            max_age=3600,
            path="/",
        )
    else:
        response.set_cookie(
            key="csrf_token",
            value=token,
            httponly=False,
            samesite="none" if not settings.DEBUG else "lax",
            secure=not settings.DEBUG,
            max_age=3600,
            path="/",
        )
    return token


class CSRFMiddleware(BaseHTTPMiddleware):
    """CSRF protection middleware.

    - GET/HEAD/OPTIONS: set csrf_token cookie if not present
    - POST/PUT/DELETE/PATCH: validate X-CSRF-Token header matches cookie
    - Auth endpoints are exempt (login/register need to work without token)
    - Disabled when settings.DISABLE_CSRF is True (for tests)
    """

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip CSRF entirely if disabled (e.g., in tests)
        if getattr(settings, "DISABLE_CSRF", False):
            return await call_next(request)

        # For safe methods: always set csrf cookie if missing (even on exempt paths,
        # so the cookie is available for subsequent state-changing requests)
        if request.method in ("GET", "HEAD", "OPTIONS"):
            response = await call_next(request)
            if "csrf_token" not in request.cookies:
                set_csrf_cookie(response, request=request)
            return response

        # Skip CSRF validation for exempt paths (auth endpoints, health)
        if request.url.path in CSRF_EXEMPT_PATHS:
            return await call_next(request)

        # State-changing methods on non-exempt paths: validate CSRF
        if request.method in ("POST", "PUT", "DELETE", "PATCH"):
            csrf_cookie = request.cookies.get("csrf_token")
            csrf_header = request.headers.get("X-CSRF-Token", "")

            # If cookie is present, validate header matches cookie (double-submit pattern)
            if csrf_cookie:
                if not csrf_header or csrf_cookie != csrf_header:
                    from fastapi.responses import JSONResponse
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "CSRF validation failed"},
                    )
            else:
                # No cookie present — likely cross-site request from Tauri webview
                # or a Bearer-authenticated client (mobile, desktop cloud).
                # CSRF protects cookie/session-based requests. A valid Bearer JWT
                # is explicit authentication (not automatic from the browser), so
                # CSRF is redundant when the request is authenticated via Bearer.
                auth_header = request.headers.get("Authorization", "")
                has_bearer = auth_header.startswith("Bearer ") and bool(auth_header[7:])
                if has_bearer:
                    # Only exempt if the Bearer token is actually valid.
                    token = auth_header[len("Bearer "):]
                    if decode_access_token(token) is not None:
                        return await call_next(request)
                # No valid Bearer — require CSRF header (fallback to double-submit).
                if not csrf_header:
                    from fastapi.responses import JSONResponse
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "CSRF validation failed"},
                    )
                # Header present, no cookie — accept (user is authenticated via JWT)

        return await call_next(request)
