"""Test DIFENSIVI deterministici del deep agent #932 (23/10).

Coprono i bug emersi dai test manuali di Mirko, in modo network-free e
deterministico (fake agent, NIENTE Ollama/rete) — come raccomanda la doc
ufficiale deepagents (Testing Guide: "unit test network-free and deterministic").

Guardia: se in futuro si tocca mind.py/tools e si rompe uno di questi
comportamenti, la suite deve fallire qui subito.
"""
import asyncio

import pytest

from app.deep_agent.agents.pdfmind import _describe_action
from app.deep_agent.server import mind as M
from app.deep_agent.tools.workspace import elenca_workspace


# ---------------------------------------------------------------------------
# Helpers: chunk fake in formato Pregel v2 (stesso di test_deep_agent_t7)
# ---------------------------------------------------------------------------
class _Msg:
    def __init__(self, type_: str, content: str = "", tool_calls: list | None = None):
        self.type = type_
        self.content = content
        self.tool_calls = tool_calls


def _v2(messages: list, interrupts: tuple = ()):
    return {"type": "values", "ns": [], "data": {"messages": messages}, "interrupts": interrupts}


class FakeAgent:
    """Fake agente con `astream` che emette sequenze controllate di chunk."""

    def __init__(self, sequences: list[list[dict]]):
        self._sequences = list(sequences)

    async def astream(self, *args, **kwargs):
        # ogni chiamata == un giro (primo giro, eventuale giro-2 di retry...)
        if self._sequences:
            seq = self._sequences.pop(0)
        else:
            seq = []
        for chunk in seq:
            yield chunk


def _collect(agent, goal: str, thread_id: str = "t-def") -> list[str]:
    out: list[str] = []

    async def _run():
        async for ev in M._events(agent, goal, thread_id, []):
            out.append(ev if isinstance(ev, str) else ev.decode())

    asyncio.run(_run())
    return out


def _text_of(out: list[str]) -> str:
    return "\n".join(out)


# ---------------------------------------------------------------------------
# 1) Elenca: cartella vuota != workspace vuoto (fix 23/10)
# ---------------------------------------------------------------------------
def test_elenca_cartella_vuota_non_dice_workspace_vuoto(tmp_path, monkeypatch):
    monkeypatch.setenv("PDFMIND_WORKSPACE", str(tmp_path))
    (tmp_path / "output").mkdir()
    (tmp_path / "root.pdf").write_text("x")  # workspace NON vuoto, output vuoto
    r = elenca_workspace(cartella="output")
    assert "cartella output/ vuota" in r
    assert "workspace vuoto" not in r


# ---------------------------------------------------------------------------
# 2) Elenca: filtro cartella -> SOLO quella sottocartella, mai la root
# ---------------------------------------------------------------------------
def test_elenca_filtra_solo_la_cartella_richiesta(tmp_path, monkeypatch):
    monkeypatch.setenv("PDFMIND_WORKSPACE", str(tmp_path))
    (tmp_path / "output").mkdir()
    (tmp_path / "radice.pdf").write_text("x")
    (tmp_path / "output" / "ciao.pdf").write_text("x")
    r = elenca_workspace(cartella="output")
    assert "ciao.pdf" in r
    assert "radice.pdf" not in r


# ---------------------------------------------------------------------------
# 3) HITL description: elimina mostra il NOME REALE del file (fix 23/10)
# ---------------------------------------------------------------------------
def test_describe_elimina_mostra_il_nome_reale():
    d = _describe_action({"name": "elimina_file", "args": {"nome": "temp_scheda-1726_uniti.pdf"}}, None, None)
    assert "temp_scheda-1726_uniti.pdf" in d
    assert "il file indicato" not in d


def test_describe_merge_mostra_i_nomi():
    d = _describe_action({"name": "merge_pdfs", "args": {"pdf_ids": ["temp", "scheda-1726"]}}, None, None)
    assert "temp" in d and "scheda-1726" in d


# ---------------------------------------------------------------------------
# 4) Orchestrazione RETRY: 1° giro senza tool -> 2° giro forzato
# ---------------------------------------------------------------------------
def test_orchestrazione_fa_il_secondo_giro_se_il_modello_non_chiama_il_tool():
    # giro 1: il modello risponde SOLO a testo (nessun tool) -> retry scatta
    giro1 = [_v2([_Msg("ai", "Non ho bisogno di strumenti.")]), _v2([_Msg("ai", "fine")])]
    # giro 2 (forzato): il modello (dopo il force_msg) chiama INFINE elenca_workspace
    giro2 = [
        _v2([_Msg("ai", tool_calls=[{"name": "elenca_workspace", "args": {}, "type": "tool_call"}])]),
        _v2([_Msg("tool", "workspace vuoto")]),
        _v2([_Msg("ai", "Ecco l'elenco")]),
        _v2([_Msg("ai", "fine")]),
    ]
    out = _collect(FakeAgent([giro1, giro2]), "elenca i file", "t-retry")
    txt = _text_of(out)
    # il server ha forzato il secondo giro: alla fine emerge l'esito reale del tool
    assert "workspace vuoto" in txt
    # e NON deve passare solo la risposta a memoria del giro 1
    assert "Non ho bisogno di strumenti" not in txt


# ---------------------------------------------------------------------------
# 5) Fine-trama elenco: mostra l'esito REALE del tool, non la narrativa
#    bugiarda del modello (fix bug1: 'a.pdf b.pdf' quando il tool dice vuoto)
# ---------------------------------------------------------------------------
def test_elenca_mostra_esito_reale_e_non_la_memoria():
    seq = [
        _v2([_Msg("ai", tool_calls=[{"name": "elenca_workspace", "args": {}, "type": "tool_call"}])]),
        _v2([_Msg("tool", "cartella output/ vuota")]),
        _v2([_Msg("ai", "Ecco i file: a.pdf b.pdf")]),
        _v2([_Msg("ai", "fine")]),
    ]
    out = _collect(FakeAgent([seq]), "elenca i file in output", "t-listing")
    txt = _text_of(out)
    assert "vuota" in txt          # esito reale del tool
    assert "a.pdf" not in txt       # la narrativa bugiarda è stata scartata


# ---------------------------------------------------------------------------
# 6) Multi-turno / conferme: 'si', 'va bene', 'riprova' sono conferme positive
#    riconosciute (forzano di nuovo il tool giusto nel retry host-side)
# ---------------------------------------------------------------------------
def test_conferme_positive_sono_riconosciute():
    from app.deep_agent.agents.pdfmind import _is_positive_confirmation

    for frase in ["si", "va bene", "ok", "procedi", "riprova", "riprove", "fallo", "unisci anche quello"]:
        assert _is_positive_confirmation(frase), f"atteso True per {frase!r}"


def test_domande_di_capacita_non_sono_operazioni():
    from app.deep_agent.agents.pdfmind import _wants_operation

    assert not _wants_operation("puoi eliminare dei file?")
    assert not _wants_operation("sai unire i pdf?")
    # ma una richiesta concreta con nome-file resta operazione
    assert _wants_operation("elimina pippo.pdf")
    assert _wants_operation("unisci temp e scheda-1726")