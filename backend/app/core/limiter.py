"""Shared rate limiter instance used across the application."""

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

limiter = Limiter(key_func=get_remote_address)

# Disable rate limiting in DEBUG mode (local dev, E2E tests).
# The rate limit protects against abuse in production; in debug it only
# blocks legitimate local testing (e.g. Playwright registering many users).
if settings.DEBUG:
    limiter.enabled = False
