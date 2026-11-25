"""Tests for the desktop Google OAuth in-memory state store (issue-1054).

Covers the TTL/expiry behaviour added to _desktop_oauth_store: abandoned
login attempts (state issued but never completed) must not accumulate
forever, and an expired state must not be accepted even if not yet purged.
"""

from datetime import datetime, timedelta, timezone

from app.api.v1 import auth as auth_module


class TestDesktopOAuthStateTTL:
    def setup_method(self):
        auth_module._desktop_oauth_store.clear()

    def teardown_method(self):
        auth_module._desktop_oauth_store.clear()

    def test_purge_removes_only_expired_states(self):
        now = datetime.now(timezone.utc)
        auth_module._desktop_oauth_store["fresh"] = {
            "used": False, "token": None, "created_at": now,
        }
        auth_module._desktop_oauth_store["stale"] = {
            "used": False, "token": None,
            "created_at": now - auth_module._DESKTOP_OAUTH_STATE_TTL - timedelta(seconds=1),
        }

        auth_module._purge_expired_oauth_states()

        assert "fresh" in auth_module._desktop_oauth_store
        assert "stale" not in auth_module._desktop_oauth_store

    def test_desktop_login_purges_expired_states_and_stores_new_one(self, client, monkeypatch):
        monkeypatch.setattr(auth_module.settings, "DISABLE_CSRF", True)
        stale_created_at = datetime.now(timezone.utc) - auth_module._DESKTOP_OAUTH_STATE_TTL - timedelta(seconds=1)
        auth_module._desktop_oauth_store["stale"] = {
            "used": False, "token": None, "created_at": stale_created_at,
        }

        resp = client.get("/auth/google/desktop-login", follow_redirects=False)

        assert resp.status_code in (302, 307)
        assert "stale" not in auth_module._desktop_oauth_store
        # Exactly the new state issued by this call remains.
        assert len(auth_module._desktop_oauth_store) == 1

    def test_desktop_callback_rejects_expired_state(self, client, monkeypatch):
        monkeypatch.setattr(auth_module.settings, "DISABLE_CSRF", True)
        expired_created_at = datetime.now(timezone.utc) - auth_module._DESKTOP_OAUTH_STATE_TTL - timedelta(seconds=1)
        auth_module._desktop_oauth_store["expired-state"] = {
            "used": False, "token": None, "created_at": expired_created_at,
        }

        resp = client.get(
            "/auth/google/desktop-callback",
            params={"code": "irrelevant", "state": "expired-state"},
            follow_redirects=False,
        )

        assert resp.status_code in (302, 307)
        assert "error=invalid_state" in resp.headers["location"]
        # The expired entry is consumed (popped) even though it was rejected.
        assert "expired-state" not in auth_module._desktop_oauth_store

    def test_desktop_callback_rejects_unknown_state(self, client, monkeypatch):
        monkeypatch.setattr(auth_module.settings, "DISABLE_CSRF", True)

        resp = client.get(
            "/auth/google/desktop-callback",
            params={"code": "irrelevant", "state": "never-issued"},
            follow_redirects=False,
        )

        assert resp.status_code in (302, 307)
        assert "error=invalid_state" in resp.headers["location"]
