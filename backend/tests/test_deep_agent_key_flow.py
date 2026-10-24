"""Test DIFENSIVI sul flusso API key del Deep Agent (piano 24/10).

Lezione registrata 24/10 (Mirko): i test difensivi dovevano coprire anche la
GESTIONE della key, non solo l'orchestrazione dell'agente. Qui:

- la key NON finisce MAI in `deep_agent_config.json` (solo `has_api_key`)
- salvataggio / lettura / round-trip / aggiornamento / cancellazione nel keystore
- migrazione delle config legacy (key in chiaro nel JSON -> keystore, JSON ripulito)
- API: PUT /mind/config scrive la key nel keystore, GET non la espone mai
- fallback env var (pattern LangChain/LangGraph: os.environ["<PROVIDER>_API_KEY"])
"""

import json

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.fixture()
def iso_config(tmp_path, monkeypatch):
    """Config Deep Agent isolata su tmp_path (file JSON + keystore)."""
    from app.deep_agent import config as dc
    from app.deep_agent import keystore

    monkeypatch.setattr(dc, "_config_path", lambda: tmp_path / "deep_agent_config.json")
    # il keystore deriva il suo .env dal path del config: resta su tmp_path
    monkeypatch.setattr(keystore, "_keys_path", lambda: tmp_path / "deep_agent_keys.env")
    return dc


# ─────────────────────────────────────────────────────────────────────────────
# 1. La key NON sta mai nel JSON di config
# ─────────────────────────────────────────────────────────────────────────────


def test_save_api_key_mai_nel_json(iso_config, tmp_path) -> None:
    """Salvando una key, il file JSON NON la contiene MAI (nemmeno per i providers)."""
    from app.deep_agent import config as dc

    dc.save(
        {
            "provider": "openai",
            "model": "gpt-4o",
            "api_key": "sk-super-segreta-123",
            "providers": [
                {"provider": "openai", "model": "gpt-4o", "api_key": "sk-super-segreta-123", "enabled": True},
                {"provider": "anthropic", "model": "claude", "api_key": "ak-altra-segreta", "enabled": True},
            ],
        }
    )
    raw = (tmp_path / "deep_agent_config.json").read_text(encoding="utf-8")
    assert "sk-super-segreta-123" not in raw
    assert "ak-altra-segreta" not in raw
    assert "api_key" not in json.loads(raw)


def test_public_mai_espone_le_key(iso_config) -> None:
    """public() non contiene MAI i valori delle chiavi, solo i flag."""
    from app.deep_agent import config as dc

    dc.save(
        {
            "provider": "openai",
            "model": "gpt-4o",
            "api_key": "sk-x",
            "providers": [{"provider": "anthropic", "model": "cl", "api_key": "ak-y", "enabled": True}],
        }
    )
    pub = dc.public()
    assert "api_key" not in pub
    for p in pub["providers"]:
        assert "api_key" not in p
    assert pub["has_api_key"] is True
    assert pub["providers"][0]["has_api_key"] is True


# ─────────────────────────────────────────────────────────────────────────────
# 2. Salvataggio / lettura / round-trip
# ─────────────────────────────────────────────────────────────────────────────


def test_round_trip_salva_e_rilegge(iso_config) -> None:
    """Salvo la key -> la rileggo identica (round-trip)."""
    from app.deep_agent import config as dc
    from app.deep_agent import keystore

    dc.save({"provider": "openai", "model": "gpt-4o", "api_key": "sk-roundtrip"})
    assert keystore.get_key("openai") == "sk-roundtrip"
    # ordered_providers (usata dal resolver) vede la key vera
    assert dc.ordered_providers()[0]["api_key"] == "sk-roundtrip"


def test_save_senza_key_non_tocca_la_esistente(iso_config) -> None:
    """Un save parziale SENZA il campo api_key NON cancella la key salvata."""
    from app.deep_agent import config as dc
    from app.deep_agent import keystore

    dc.save({"provider": "openai", "model": "gpt-4o", "api_key": "sk-resta"})
    dc.save({"model": "gpt-4o-mini"})  # nessuna key nel payload
    assert keystore.get_key("openai") == "sk-resta"
    assert dc.public()["has_api_key"] is True


def test_aggiornamento_key(iso_config) -> None:
    """Una nuova key dello stesso provider SOSTITUISCE la vecchia."""
    from app.deep_agent import config as dc
    from app.deep_agent import keystore

    dc.save({"provider": "openai", "model": "gpt-4o", "api_key": "sk-vecchia"})
    dc.save({"provider": "openai", "model": "gpt-4o", "api_key": "sk-nuova"})
    assert keystore.get_key("openai") == "sk-nuova"


def test_cancellazione_key_con_stringa_vuota(iso_config) -> None:
    """api_key vuota nel payload = la chiave viene CANCELLATA (e il flag segue)."""
    from app.deep_agent import config as dc
    from app.deep_agent import keystore

    dc.save({"provider": "openai", "model": "gpt-4o", "api_key": "sk-da-cancellare"})
    dc.save({"provider": "openai", "model": "gpt-4o", "api_key": ""})
    assert keystore.get_key("openai") == ""
    assert dc.public()["has_api_key"] is False


def test_cancellazione_key_via_delete(iso_config) -> None:
    """delete_key() rimuove la chiave (usato da flussi di cleanup)."""
    from app.deep_agent import keystore

    keystore.set_key("openai", "sk-x")
    assert keystore.has_key("openai") is True
    keystore.delete_key("openai")
    assert keystore.has_key("openai") is False


def test_providers_singola_key_condivisa_per_provider(iso_config) -> None:
    """La key di un provider nella lista `providers` è la stessa letta dal resolver."""
    from app.deep_agent import config as dc
    from app.deep_agent import keystore
    from app.deep_agent.agents.pdfmind import _provider_usable

    dc.save(
        {
            "providers": [
                {"provider": "anthropic", "model": "claude", "api_key": "ak-provv", "enabled": True},
            ]
        }
    )
    assert keystore.get_key("anthropic") == "ak-provv"
    assert _provider_usable(dc.ordered_providers()[0]) is True


# ─────────────────────────────────────────────────────────────────────────────
# 3. Migrazione config legacy (key in chiaro dentro il JSON)
# ─────────────────────────────────────────────────────────────────────────────


def test_migrazione_legacy_sposta_key_nel_keystore(iso_config, tmp_path) -> None:
    """Una config salvata PRIMA del 24/10 (key nel JSON) viene migrata al keystore
    e il file viene riscritto senza la chiave in chiaro."""
    from app.deep_agent import keystore

    p = tmp_path / "deep_agent_config.json"
    p.write_text(
        json.dumps(
            {
                "provider": "anthropic",
                "model": "claude",
                "api_key": "sk-legacy-segreta",
                "providers": [{"provider": "openai", "model": "gpt-4o", "api_key": "sk-altra", "enabled": True}],
            }
        ),
        encoding="utf-8",
    )
    # load() migra al volo
    from app.deep_agent import config as dc

    cfg = dc.load()
    assert "api_key" not in cfg
    assert keystore.get_key("anthropic") == "sk-legacy-segreta"
    assert keystore.get_key("openai") == "sk-altra"
    # file riscritto senza chiavi
    raw = p.read_text(encoding="utf-8")
    assert "sk-legacy-segreta" not in raw
    assert "sk-altra" not in raw


# ─────────────────────────────────────────────────────────────────────────────
# 4. API: PUT scrive nel keystore, GET non espone mai la key
# ─────────────────────────────────────────────────────────────────────────────


def test_api_put_key_salvata_get_mai_esposta(client, tmp_path, monkeypatch) -> None:
    from app.deep_agent import config as dc
    from app.deep_agent import keystore

    monkeypatch.setattr(dc, "_config_path", lambda: tmp_path / "deep_agent_config.json")
    monkeypatch.setattr(keystore, "_keys_path", lambda: tmp_path / "deep_agent_keys.env")

    r = client.put("/mind/config", json={"provider": "openai", "model": "gpt-4o", "api_key": "sk-via-api"})
    assert r.status_code == 200
    body = r.json()
    assert "api_key" not in body
    assert body["has_api_key"] is True
    # la key è DAVVERO nel keystore, non nel JSON
    assert keystore.get_key("openai") == "sk-via-api"
    assert "sk-via-api" not in (tmp_path / "deep_agent_config.json").read_text(encoding="utf-8")


def test_api_put_key_vuota_cancella(client, tmp_path, monkeypatch) -> None:
    from app.deep_agent import config as dc
    from app.deep_agent import keystore

    monkeypatch.setattr(dc, "_config_path", lambda: tmp_path / "deep_agent_config.json")
    monkeypatch.setattr(keystore, "_keys_path", lambda: tmp_path / "deep_agent_keys.env")

    client.put("/mind/config", json={"provider": "openai", "api_key": "sk-da-via-api"})
    assert keystore.get_key("openai") == "sk-da-via-api"
    r = client.put("/mind/config", json={"provider": "openai", "api_key": ""})
    assert r.json()["has_api_key"] is False
    assert keystore.get_key("openai") == ""


def test_api_models_usa_la_key_salvata(client, tmp_path, monkeypatch) -> None:
    """/mind/models per i cloud usa la key salvata nel keystore (non la inventa)."""
    from app.deep_agent import config as dc
    from app.deep_agent import keystore
    from app.deep_agent.config import env_for

    monkeypatch.setattr(dc, "_config_path", lambda: tmp_path / "deep_agent_config.json")
    monkeypatch.setattr(keystore, "_keys_path", lambda: tmp_path / "deep_agent_keys.env")

    keystore.set_key("openai", "sk-per-models")
    r = client.get("/mind/models?provider=openai")
    assert r.status_code == 200
    body = r.json()
    # senza rete: ok:false con messaggio (mai crash), MAI una lista inventata
    assert body["ok"] in (True, False)
    if not body["ok"]:
        assert body["models"] == []
    assert env_for("openai") == "PDFMIND_OPENAI_API_KEY"


def test_api_test_cloud_con_key_nel_keystore(client, tmp_path, monkeypatch) -> None:
    from app.deep_agent import config as dc
    from app.deep_agent import keystore

    monkeypatch.setattr(dc, "_config_path", lambda: tmp_path / "deep_agent_config.json")
    monkeypatch.setattr(keystore, "_keys_path", lambda: tmp_path / "deep_agent_keys.env")

    # nessuna key -> ok:false (non crasha)
    r = client.post("/mind/test", json={"provider": "anthropic", "model": "claude-3-7-sonnet-latest"})
    assert r.status_code == 200
    assert r.json()["ok"] is False
    # con key nel keystore -> ok:true (config completa)
    keystore.set_key("anthropic", "ak-test")
    r2 = client.post("/mind/test", json={"provider": "anthropic", "model": "claude-3-7-sonnet-latest"})
    assert r2.status_code == 200
    assert r2.json()["ok"] is True


# ─────────────────────────────────────────────────────────────────────────────
# 5. Fallback env var (pattern LangChain/LangGraph) per retro-compat
# ─────────────────────────────────────────────────────────────────────────────


def test_get_key_fallback_env_var(monkeypatch, iso_config) -> None:
    """Senza key nel keystore, la env var <PROVIDER>_API_KEY resta una fonte valida."""
    from app.deep_agent import keystore

    monkeypatch.setenv("PDFMIND_OPENAI_API_KEY", "sk-da-env")
    assert keystore.get_key("openai") == "sk-da-env"
    assert keystore.has_key("openai") is True


def test_get_key_priorita_keystore_su_env(monkeypatch, iso_config) -> None:
    """La key salvata nel keystore ha PRIORITÀ sulla env var (non la ignoriamo)."""
    from app.deep_agent import keystore

    monkeypatch.setenv("PDFMIND_OPENAI_API_KEY", "sk-env-vecchia")
    keystore.set_key("openai", "sk-keystore-nuova")
    assert keystore.get_key("openai") == "sk-keystore-nuova"


def test_resolve_model_usa_la_key_del_keystore(monkeypatch, tmp_path) -> None:
    """_resolve_model per i cloud passa la key del keystore a init_chat_model."""
    import langchain_openai
    from app.deep_agent import config as dc
    from app.deep_agent import keystore
    from app.deep_agent.agents.pdfmind import _resolve_model

    # isola keystore e config su tmp_path (non tocchiamo i dati reali dei test)
    monkeypatch.setattr(dc, "_config_path", lambda: tmp_path / "deep_agent_config.json")
    monkeypatch.setattr(keystore, "_keys_path", lambda: tmp_path / "deep_agent_keys.env")

    captured: dict = {}

    def fake_init(model, model_provider, api_key, base_url):
        captured["api_key"] = api_key
        return langchain_openai.ChatOpenAI(model=model, api_key=api_key or "dummy", base_url=base_url)

    monkeypatch.setattr("app.deep_agent.agents.pdfmind.init_chat_model", fake_init)
    monkeypatch.setenv("PDFMIND_OPENAI_API_KEY", "sk-dalla-env")
    keystore.set_key("openai", "sk-dal-keystore")
    _resolve_model("openai:gpt-4o")
    assert captured["api_key"] == "sk-dal-keystore"
