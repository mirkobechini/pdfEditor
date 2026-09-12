"""Encryption for cached PDF passwords.

Stores PDF passwords encrypted at rest (not plaintext) in the password_cache
table. Uses Fernet (symmetric) keyed from the app SECRET_KEY so that a DB
dump or admin read does not expose the PDF passwords in clear.
"""

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


def _get_fernet() -> Fernet:
    """Build a Fernet instance from the app SECRET_KEY.

    The SECRET_KEY is hashed (SHA-256) and base64-encoded to produce a valid
    32-byte Fernet key. This keeps a single source of truth for the secret.
    """
    secret = settings.SECRET_KEY or settings.JWT_SECRET_KEY or "pdfeditor-insecure-fallback"
    digest = hashlib.sha256(secret.encode("utf-8")).digest()
    key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def encrypt_password(plaintext: str) -> str:
    """Encrypt a PDF password for storage at rest."""
    if not plaintext:
        return plaintext
    return _get_fernet().encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_password(ciphertext: str) -> str:
    """Decrypt a stored PDF password. Returns the input unchanged if it is
    not a valid Fernet token (e.g. legacy plaintext entries)."""
    if not ciphertext:
        return ciphertext
    try:
        return _get_fernet().decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except (InvalidToken, ValueError):
        # Legacy plaintext entry (pre-encryption) — return as-is.
        return ciphertext