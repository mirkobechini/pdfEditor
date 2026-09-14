"""Tests for password_cipher — encrypted storage of cached PDF passwords."""

import pytest

from app.core.password_cipher import encrypt_password, decrypt_password


class TestPasswordCipher:
    def test_encrypt_then_decrypt_roundtrip(self):
        """A password encrypted then decrypted returns the original."""
        original = "my-secret-pdf-pass"
        encrypted = encrypt_password(original)
        assert encrypted != original  # not stored in plaintext
        assert decrypt_password(encrypted) == original

    def test_encrypted_value_is_not_plaintext(self):
        """The stored value must not contain the plaintext password."""
        original = "super-secret-123"
        encrypted = encrypt_password(original)
        assert original not in encrypted

    def test_encrypt_uses_random_nonce(self):
        """Fernet uses a random nonce, so same input produces different
        ciphertext each time (this is expected and more secure)."""
        a = encrypt_password("same-pass")
        b = encrypt_password("same-pass")
        assert a != b  # random nonce
        assert decrypt_password(a) == "same-pass"
        assert decrypt_password(b) == "same-pass"

    def test_decrypt_legacy_plaintext_returns_as_is(self):
        """Legacy plaintext entries (pre-encryption) are returned unchanged."""
        assert decrypt_password("legacy-plaintext") == "legacy-plaintext"

    def test_empty_password_roundtrip(self):
        """Empty password is returned unchanged (no encryption)."""
        assert encrypt_password("") == ""
        assert decrypt_password("") == ""

    def test_different_passwords_produce_different_ciphertext(self):
        """Different passwords must produce different stored values."""
        assert encrypt_password("pass-1") != encrypt_password("pass-2")