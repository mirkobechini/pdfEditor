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
    "/auth/forgot-password",
    "/auth/reset-password",
    "/health",
}


class CSRFMiddleware(BaseHTTPMiddleware):
    """CSRF protection middleware.

    - GET/HEAD/OPTIONS: set csrf_token cookie if not present
    - POST/PUT/DELETE/PATCH: validate X-CSRF-Token header matches cookie
    - Auth endpoints are exempt (login/register need to work without token)
    """

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip CSRF for exempt paths
        if request.url.path in CSRF_EXEMPT_PATHS:
            return await call_next(request)

        if request.method in ("GET", "HEAD", "OPTIONS"):
            response = await call_next(request)
            # Set CSRF cookie if not present
            if "csrf_token" not in request.cookies:
                token = secrets.token_hex(32)
                response.set_cookie(
                    key="csrf_token",
                    value=token,
                    httponly=True,
                    samesite="lax",
                    secure=not settings.DEBUG,
                    max_age=3600,  # 1 hour
                    path="/",
                )
            return response

        # State-changing methods: validate CSRF
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
