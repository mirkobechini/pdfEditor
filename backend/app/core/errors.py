"""Standardized error codes and helper for consistent API error responses.

Every HTTPException in the API should use this helper to ensure
consistent error codes that the frontend can map to i18n keys.
"""

from fastapi import HTTPException, status


class ErrorCode:
    """Centralized error codes for the API.

    Each code maps to a stable i18n key on the frontend.
    """
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    RATE_LIMIT = "RATE_LIMIT"
    NOT_AUTHENTICATED = "NOT_AUTHENTICATED"
    FORBIDDEN = "FORBIDDEN"
    NOT_FOUND = "NOT_FOUND"
    PDF_NOT_FOUND = "PDF_NOT_FOUND"
    PDF_FILE_NOT_FOUND = "PDF_FILE_NOT_FOUND"
    UPLOAD_TOO_LARGE = "UPLOAD_TOO_LARGE"
    INVALID_PDF = "INVALID_PDF"
    INVALID_FILE_TYPE = "INVALID_FILE_TYPE"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    EMAIL_ALREADY_REGISTERED = "EMAIL_ALREADY_REGISTERED"
    PASSWORD_TOO_WEAK = "PASSWORD_TOO_WEAK"
    RESET_TOKEN_INVALID = "RESET_TOKEN_INVALID"
    RESET_TOKEN_EXPIRED = "RESET_TOKEN_EXPIRED"
    GOOGLE_AUTH_FAILED = "GOOGLE_AUTH_FAILED"
    CONVERSION_FAILED = "CONVERSION_FAILED"
    SEARCH_TEXT_EMPTY = "SEARCH_TEXT_EMPTY"
    MERGE_TOO_FEW = "MERGE_TOO_FEW"
    SPLIT_INVALID_RANGE = "SPLIT_INVALID_RANGE"
    CANNOT_DEMOTE_SUPER_ADMIN = "CANNOT_DEMOTE_SUPER_ADMIN"
    STRIPE_LICENSE_LOCKED = "STRIPE_LICENSE_LOCKED"
    FAILED_TO_GENERATE_TOKEN = "FAILED_TO_GENERATE_TOKEN"
    BUG_NOT_FOUND = "BUG_NOT_FOUND"
    BUG_VOTE_NOT_FOUND = "BUG_VOTE_NOT_FOUND"
    INTERNAL_ERROR = "INTERNAL_ERROR"


def error_response(
    code: str,
    detail: str,
    status_code: int = status.HTTP_400_BAD_REQUEST,
) -> HTTPException:
    """Create a standardized HTTPException with a stable error code.

    The frontend uses the 'code' field to map to i18n keys,
    while 'detail' is a human-readable fallback (English) for debugging.
    """
    return HTTPException(
        status_code=status_code,
        detail={
            "code": code,
            "detail": detail,
        },
    )