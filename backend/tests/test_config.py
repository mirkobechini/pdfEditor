"""Tests for config.py — Settings validation and properties."""

import pytest

from app.core.config import Settings


@pytest.fixture(autouse=True)
def _clear_env(monkeypatch):
    """Clear env vars that Settings reads, to get clean defaults."""
    for var in [
        "SECRET_KEY", "JWT_SECRET_KEY", "DEBUG", "ALLOWED_ORIGINS",
        "ALLOWED_EXTENSIONS", "DATABASE_URL", "STORAGE_BACKEND",
        "SUPER_ADMIN_EMAIL", "SMTP_SERVER", "SMTP_PORT",
    ]:
        monkeypatch.delenv(var, raising=False)


class TestSettingsValidation:
    """Test Settings class validation and properties."""

    def test_secret_key_empty_by_default(self):
        """SECRET_KEY should be empty by default."""
        s = Settings(_env_file=None)
        assert s.SECRET_KEY == ""

    def test_effective_secret_key_fallback(self):
        """effective_secret_key should fall back to SECRET_KEY."""
        s = Settings(_env_file=None, SECRET_KEY="mykey", JWT_SECRET_KEY="")
        assert s.effective_secret_key == "mykey"

    def test_effective_secret_key_jwt_priority(self):
        """effective_secret_key should prefer JWT_SECRET_KEY."""
        s = Settings(_env_file=None, SECRET_KEY="old", JWT_SECRET_KEY="new")
        assert s.effective_secret_key == "new"

    def test_allowed_origins_list_single(self):
        """Single origin should parse correctly."""
        s = Settings(_env_file=None, ALLOWED_ORIGINS="http://localhost:3000", SECRET_KEY="test")
        assert s.allowed_origins_list == ["http://localhost:3000"]

    def test_allowed_origins_list_multiple(self):
        """Comma-separated origins should parse correctly."""
        s = Settings(_env_file=None, ALLOWED_ORIGINS="http://a.com,https://b.com", SECRET_KEY="test")
        assert s.allowed_origins_list == ["http://a.com", "https://b.com"]

    def test_allowed_origins_list_with_spaces(self):
        """Origins with extra spaces should be trimmed."""
        s = Settings(_env_file=None, ALLOWED_ORIGINS="http://a.com, https://b.com", SECRET_KEY="test")
        assert s.allowed_origins_list == ["http://a.com", "https://b.com"]

    def test_allowed_extensions_list_single(self):
        """Single extension should parse correctly."""
        s = Settings(_env_file=None, ALLOWED_EXTENSIONS=".pdf", SECRET_KEY="test")
        assert s.allowed_extensions_list == [".pdf"]

    def test_allowed_extensions_list_multiple(self):
        """Comma-separated extensions should parse correctly."""
        s = Settings(_env_file=None, ALLOWED_EXTENSIONS=".pdf,.png,.jpg", SECRET_KEY="test")
        assert s.allowed_extensions_list == [".pdf", ".png", ".jpg"]

    def test_database_url_sqlite_unchanged(self):
        """SQLite URLs should not be modified."""
        s = Settings(_env_file=None, DATABASE_URL="sqlite:///./test.db", SECRET_KEY="test")
        assert s.DATABASE_URL == "sqlite:///./test.db"

    def test_database_url_postgresql_gets_psycopg(self):
        """PostgreSQL URLs should get +psycopg dialect."""
        s = Settings(_env_file=None, DATABASE_URL="postgresql://user:pass@localhost/db", SECRET_KEY="test")
        assert "+psycopg" in s.DATABASE_URL

    def test_database_url_postgresql_already_psycopg(self):
        """PostgreSQL URLs with psycopg already should not be double-modified."""
        s = Settings(_env_file=None, DATABASE_URL="postgresql+psycopg://user:pass@localhost/db", SECRET_KEY="test")
        assert s.DATABASE_URL == "postgresql+psycopg://user:pass@localhost/db"

    def test_debug_default_false(self):
        """DEBUG should default to False."""
        s = Settings(_env_file=None, SECRET_KEY="test")
        assert s.DEBUG is False

    def test_debug_can_be_true(self):
        """DEBUG should be settable to True."""
        s = Settings(_env_file=None, DEBUG=True, SECRET_KEY="test")
        assert s.DEBUG is True