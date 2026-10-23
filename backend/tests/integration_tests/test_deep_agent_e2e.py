"""E2E deep agent #932 — provider REALE (Ollama locale) — TEST DI INTEGRAZIONE.

Secondo la doc ufficiale deepagents (Testing Guide), i test che usano un
provider reale NON vanno nella suite unit network-free, ma in una cartella
separata `tests/integration_tests/` e vanno marcati `@pytest.mark.integration`
(in `pyproject.toml` i marker `integration`/`unit` esistono già).

Vengono eseguiti nella CI DESKTOP (il deep agent è il sidecar del desktop):
`ci-desktop.yml` -> job `deep-agent-e2e` (ubuntu) che installa Ollama, scarica
un modello piccolo e lancia `pytest tests/integration_tests -m integration`.

I test SKIPPANO silenziosamente se Ollama non è raggiungibile o il modello
non è presente: così non rompono mai la suite quando il runner non ha Ollama.

Per puntare un modello/diminuire la lentezza nei test:
    PDFMIND_E2E_MODEL   (default "qwen3:0.6b" — modello tiny, solo per il flusso)
    PDFMIND_OLLAMA_URL  (default http://127.0.0.1:11434)
"""
import asyncio
import os

import pytest

pytestmark = pytest.mark.integration

_OL_URL = os.environ.get("PDFMIND_OLLAMA_URL", "http://127.0.0.1:11434")
_MODEL = os.environ.get("PDFMIND_E2E_MODEL", "qwen3:0.6b")


def _ollama_up() -> bool:
    import urllib.request

    try:
        with urllib.request.urlopen(f"{_OL_URL}/api/version", timeout=2) as r:
            return r.status == 200
    except Exception:
        return False


pytest.skip(f"Ollama non raggiungibile ({_OL_URL}); salto E2E deep agent", allow_module_level=True) \
    if not _ollama_up() else None


@pytest.fixture()
def agent():
    from app.deep_agent.agents.pdfmind import build_agent

    return build_agent(model=f"ollama:{_MODEL}", profile="user")


def _events_of(agent, goal: str, thread_id: str, history: list[dict] | None = None) -> list[str]:
    from app.deep_agent.server import mind as M

    out: list[str] = []

    async def _run():
        async for ev in M._events(agent, goal, thread_id, history or []):
            out.append(ev if isinstance(ev, str) else ev.decode())

    asyncio.run(_run())
    return out


def test_e2e_elenca_cartella_output(tmp_path, monkeypatch, agent):
    """elenca i file in/su output -> SOLO output (mai la cronologia/root)."""
    (tmp_path / "output").mkdir()
    (tmp_path / "radice.pdf").write_bytes(b"x")
    (tmp_path / "output" / "ciao.pdf").write_bytes(b"x")
    monkeypatch.setenv("PDFMIND_WORKSPACE", str(tmp_path))

    out = _events_of(agent, "elenca i file in output", "e2e-elenca")
    txt = "\n".join(out)
    assert "ciao.pdf" in txt


def test_e2e_elenca_non_risponde_a_memoria(tmp_path, monkeypatch, agent):
    """Con output vuoto ma cronologia che 'ricorda' file, mostra l'esito VERO."""
    (tmp_path / "output").mkdir()
    (tmp_path / "radice.pdf").write_bytes(b"x")
    monkeypatch.setenv("PDFMIND_WORKSPACE", str(tmp_path))

    hist = [
        {"role": "user", "content": "elenca i file nella cartella output"},
        {"role": "assistant", "content": "VECCHIO1.pdf, VECCHIO2.pdf"},
    ]
    out = _events_of(agent, "elenca i file in output", "e2e-nomemoria", hist)
    txt = "\n".join(out)
    assert "VECCHIO1.pdf" not in txt  # non deve riparlare file che non esistono