"""Test DIFENSIVI — key mascherata (richiesta Mirko 24/10).

La UI del deep agent deve mostrare la chiave in forma MASCHERATA (primi e
ultimi caratteri, mai il valore intero), come fanno le altre app. Questi
test garantiscono che:

- mask_key() produca sempre 4+4 caratteri (o 2+2 per chiavi corte) e MAI
  la chiave intera;
- public() esponga api_key_masked (top-level e per ogni voce providers)
  senza MAI rivelare la chiave;
- ollama (senza chiave) abbia sempre api_key_masked vuota ma has_api_key=True;
- il valore dell'ambiente / keystore resti intatto (la mascheratura è solo
  una rappresentazione, non altera lo storage).
"""

import pytest


@pytest.fixture()
def iso_config(tmp_path, monkeypatch):
    """Config Deep Agent isolata su tmp_path (file JSON + keystore)."""
    from app.deep_agent import config as dc
    from app.deep_agent import keystore

    monkeypatch.setattr(dc, "_config_path", lambda: tmp_path / "deep_agent_config.json")
    monkeypatch.setattr(keystore, "_keys_path", lambda: tmp_path / "deep_agent_keys.env")
    return dc


# ── mask_key ────────────────────────────────────────────────────────────────


def test_mask_key_lunga_mostra_solo_prime_e_ultime_quattro() -> None:
    from app.deep_agent import keystore

    k = "sk-ant-secret-abc-xyz"  # 20 char
    m = keystore.mask_key(k)
    assert m == "sk-a…-xyz"
    assert "secret" not in m
    assert len(m.split("…")[0]) == 4
    assert len(m.split("…")[1]) == 4


def test_mask_key_corta_mostra_2_e_2() -> None:
    from app.deep_agent import keystore

    assert keystore.mask_key("ab12cd34") == "ab…34"  # 8 char → 2+2
    assert keystore.mask_key("abc") == "ab…bc"


def test_mask_key_vuota_o_none() -> None:
    from app.deep_agent import keystore

    assert keystore.mask_key("") == ""
    assert keystore.mask_key(None) == ""


def test_mask_key_mai_piu_di_4_caratteri_per_lato() -> None:
    """Difensivo: qualunque lunghezza, mai esposizione parziale larga."""
    from app.deep_agent import keystore

    for k in ["a", "ab", "abc", "abcd", "abcde", "a" * 12, "a" * 40, "x" * 100]:
        m = keystore.mask_key(k)
        head, tail = m.split("…")
        assert len(head) <= 4, (k, m)
        assert len(tail) <= 4, (k, m)


# ── public() con api_key_masked ─────────────────────────────────────────────


def test_public_espone_solo_mascherata_mai_la_key(iso_config) -> None:
    from app.deep_agent import config as dc

    dc.save(
        {
            "provider": "openai",
            "model": "gpt-4o",
            "api_key": "sk-ant-secret-abcdefgh",
            "providers": [
                {"provider": "openai", "model": "gpt-4o", "api_key": "sk-ant-secret-abcdefgh", "enabled": True},
                {"provider": "anthropic", "model": "cl", "api_key": "sk-ant-alt-123456789", "enabled": True},
            ],
        }
    )
    pub = dc.public()
    # mai la chiave intera, da nessuna parte
    assert "api_key" not in pub
    assert "sk-ant-secret-abcdefgh" not in str(pub)
    assert "sk-ant-alt-123456789" not in str(pub)
    # top-level: mascherata coerente con la key dell'openai attivo
    assert pub["api_key_masked"] == "sk-a…efgh"
    assert len(pub["api_key_masked"].split("…")[0]) == 4
    # per ogni voce: has_api_key + api_key_masked, mai la key
    for p in pub["providers"]:
        assert "api_key" not in p
        assert "api_key_masked" in p
        assert "…" in p["api_key_masked"] or p["api_key_masked"] == ""
    assert pub["providers"][0]["has_api_key"] is True
    assert pub["providers"][1]["has_api_key"] is True


def test_public_ollama_mascherata_vuota_ma_usable(iso_config) -> None:
    from app.deep_agent import config as dc

    dc.save({"provider": "ollama", "model": "qwen3.5", "api_key": ""})
    pub = dc.public()
    assert pub["api_key_masked"] == ""
    assert pub["has_api_key"] is True  # ollama non richiede chiave


def test_public_senza_key_mascherata_vuota(iso_config) -> None:
    from app.deep_agent import config as dc

    dc.save({"provider": "anthropic", "model": "cl"})  # nessuna key salvata
    pub = dc.public()
    assert pub["has_api_key"] is False
    assert pub["api_key_masked"] == ""


def test_mask_non_altera_lo_storage(iso_config) -> None:
    """La mascheratura è solo rappresentazione: la chiave salvata resta intatta."""
    from app.deep_agent import config as dc
    from app.deep_agent import keystore

    dc.save({"provider": "openai", "model": "gpt-4o", "api_key": "sk-ant-secret-abcdefgh"})
    dc.public()  # leggere la forma mascherata non tocca il keystore
    assert keystore.get_key("openai") == "sk-ant-secret-abcdefgh"
