"""CSRF protection middleware."""

import secrets
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.config import settings


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
        request.url.host in ("127.0.0.1", "localhost", "::1")
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

            if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
                from fastapi.responses import JSONResponse
                return JSONResponse(
                    status_code=403,
                    content={"detail": "CSRF validation failed"},
                )

        return await call_next(request)
