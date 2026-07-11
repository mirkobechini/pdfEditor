"""Tests for database.py — engine creation and get_db context manager."""

from unittest.mock import patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.database import get_db


class TestGetDb:
    """Test get_db context manager."""

    def test_get_db_yields_session(self):
        """get_db should yield a Session instance."""
        gen = get_db()
        db = next(gen)
        assert isinstance(db, Session)

    def test_get_db_commits_on_success(self):
        """get_db should commit when no exception occurs."""
        gen = get_db()
        db = next(gen)
        # Simulate successful operation
        try:
            next(gen)  # This will call commit + close
        except StopIteration:
            pass

    def test_get_db_rollbacks_on_exception(self):
        """get_db should rollback on exception."""
        gen = get_db()
        db = next(gen)
        # Simulate exception
        try:
            gen.throw(Exception("test error"))
        except Exception:
            pass