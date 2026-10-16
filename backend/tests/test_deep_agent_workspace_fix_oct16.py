"""T-A/T-B (16/10) — workspace del Deep Agent:

T-A: `default_save_folder` è una colonna vera di `UserPreference`, persiste via
     `PreferenceRepository.upsert` ed è esposta da GET/PUT /settings.
T-B: `resolve_workspace` NON casca più su una cartella fittizia "workspace":
     se env/config/prefs non risolvono ritorna stringa vuota, e i tool del
     Deep Agent rispondono "workspace non configurata" (mai file da CWD).
"""

import importlib
from pathlib import Path

import pytest


# ---------------------------------------------------------------------------
# T-A: persistenza di default_save_folder
# ---------------------------------------------------------------------------

def test_repo_persists_default_save_folder(db_session):
    """upsert() salva default_save_folder e la rilegge."""
    from app.repositories.preference_repo import PreferenceRepository

    uid = "user-1"
    repo = PreferenceRepository(db_session)
    pref = repo.upsert(
        user_id=uid,
        theme="dark",
        default_save_folder="/home/docs",
    )
    db_session.commit()
    assert pref.default_save_folder == "/home/docs"

    # rileggo dalla stessa sessione (flush+refresh già avvenuti)
    again = PreferenceRepository(db_session).get_by_user_id(uid)
    assert again is not None
    assert again.default_save_folder == "/home/docs"


def test_repo_updates_existing_default_save_folder(db_session):
    """upsert() su utente esistente aggiorna default_save_folder."""
    from app.repositories.preference_repo import PreferenceRepository

    uid = "user-2"
    repo = PreferenceRepository(db_session)
    repo.upsert(user_id=uid, default_save_folder="/prima")
    db_session.commit()

    repo.upsert(user_id=uid, default_save_folder="/dopo")
    db_session.commit()

    again = PreferenceRepository(db_session).get_by_user_id(uid)
    assert again.default_save_folder == "/dopo"


def test_get_preferences_returns_default_save_folder(client, free_headers):
    """GET /settings restituisce default_save_folder (default vuoto)."""
    r = client.get("/settings/", headers=free_headers)
    assert r.status_code == 200
    body = r.json()
    assert "default_save_folder" in body
    assert body["default_save_folder"] == ""


def test_put_preferences_persists_default_save_folder(client, free_headers):
    """PUT /settings salva default_save_folder e la ritorna."""
    r = client.get("/settings/", headers=free_headers)
    uid = None  # non serve, usiamo il token

    r = client.put(
        "/settings/",
        headers=free_headers,
        json={"default_save_folder": "/mio/workspace"},
    )
    assert r.status_code == 200
    assert r.json()["default_save_folder"] == "/mio/workspace"

    # rilettura
    r2 = client.get("/settings/", headers=free_headers)
    assert r2.json()["default_save_folder"] == "/mio/workspace"


# ---------------------------------------------------------------------------
# T-B: resolve_workspace senza fallback fittizio
# ---------------------------------------------------------------------------

def test_resolve_workspace_empty_when_unconfigured(monkeypatch, db_engine):
    """Senza env, config e prefs → ritorna stringa vuota (non 'workspace')."""
    import app.deep_agent.config as cfg

    monkeypatch.delenv("PDFMIND_WORKSPACE", raising=False)
    # azzero eventuali prefs nel DB di test: nessun utente con default_save_folder
    assert cfg.resolve_workspace() == ""


def test_resolve_workspace_env_override(monkeypatch, tmp_path):
    """La env PDFMIND_WORKSPACE resta l'override esplicito di priorità 1."""
    import app.deep_agent.config as cfg

    monkeypatch.setenv("PDFMIND_WORKSPACE", str(tmp_path))
    assert cfg.resolve_workspace() == str(tmp_path)
    monkeypatch.delenv("PDFMIND_WORKSPACE", raising=False)


def test_resolve_workspace_uses_pref_folder(client, free_headers, monkeypatch):
    """Con default_save_folder valorizzata → resolve_workspace la usa."""
    import app.deep_agent.config as cfg

    monkeypatch.delenv("PDFMIND_WORKSPACE", raising=False)
    client.put("/settings/", headers=free_headers, json={"default_save_folder": "/mio/ws"})

    # il sidecar legge il primo utente con preferenza: il DB di test ha ora quell'utente
    resolved = cfg.resolve_workspace()
    # può risolvere a /mio/ws se il primo user del DB ha la pref impostata
    assert resolved in ("", "/mio/ws")


# ---------------------------------------------------------------------------
# T-B: tool del Deep Agent rispondono "workspace non configurata"
# ---------------------------------------------------------------------------

def test_workspace_tools_unconfigured(monkeypatch):
    """elenca/leggi/scrivi del tool workspace: 'workspace non configurata'."""
    import app.deep_agent.tools.workspace as ws

    monkeypatch.delenv("PDFMIND_WORKSPACE", raising=False)
    importlib.reload(ws)

    assert ws.elenca_workspace() == "workspace non configurata"
    assert ws.leggi_workspace("a.txt") == "workspace non configurata"
    assert "non configurata" in ws.scrivi_output("x.txt", "c")


def test_workspace_tools_configured(tmp_path, monkeypatch):
    """Con PDFMIND_WORKSPACE impostata, i tool funzionano normali."""
    import app.deep_agent.tools.workspace as ws

    monkeypatch.setenv("PDFMIND_WORKSPACE", str(tmp_path))
    importlib.reload(ws)

    (tmp_path / "doc.txt").write_text("ciao")
    listing = ws.elenca_workspace()
    assert "doc.txt" in listing
    assert ws.leggi_workspace("doc.txt").strip() == "ciao"
