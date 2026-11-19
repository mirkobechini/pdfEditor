"""T6 — REST API pubblica documentata (/mind/*, OpenAPI, skills)."""

from fastapi.testclient import TestClient

from app.main import app


def test_mind_skills_lists_tools() -> None:
    c = TestClient(app)
    r = c.get("/mind/skills")
    assert r.status_code == 200
    body = r.json()
    assert body["engine"] == "deep_agent"
    assert body["profile"] == "user"
    # tools dell'agente (famiglia app) presenti
    assert "split_pdf" in body["tools"]
    assert "merge_pdfs" in body["tools"]
    assert "sign_pdf" in body["tools"]
    assert "ocr_pdf" in body["tools"]
    assert body["capabilities"]["chat"]["streaming"] is True
    assert body["capabilities"]["rag"] is True


def test_mind_schema_has_all_routes_with_summary() -> None:
    schema = app.openapi()
    paths = [p for p in schema["paths"] if p.startswith("/mind")]
    assert "/mind/health" in paths
    assert "/mind/skills" in paths
    assert "/mind/config" in paths
    assert "/mind/chat" in paths
    assert "/mind/approve" in paths
    # summary/description documentati
    assert schema["paths"]["/mind/skills"]["get"]["summary"]
    assert schema["paths"]["/mind/chat"]["post"]["summary"]
    assert schema["paths"]["/mind/chat"]["post"]["description"]


def test_mind_schema_is_valid_api() -> None:
    schema = app.openapi()
    assert schema["openapi"]
    assert schema["info"]["title"]
    # tutti i percorsi /mind sono presenti nello schema
    assert any("/mind" in p for p in schema["paths"])
    assert set(schema["paths"]).issuperset({"/mind/health", "/mind/chat", "/mind/config", "/mind/skills", "/mind/approve"})
