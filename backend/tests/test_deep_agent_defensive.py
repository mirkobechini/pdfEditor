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


class RaisingAgent:
    """Fake agente il cui astream LANCIA — simula un errore del provider cloud.

    Nota: `astream` è un async generator (fa `yield`): per lanciare "alla prima
    iterazione" solleviamo PRIMA del primo yield, restando un async generator
    valido (con `raise` secco sarebbe una coroutine, non iterabile via async for).
    """

    def __init__(self, exc: Exception):
        self._exc = exc

    async def astream(self, *args, **kwargs):
        if True:
            raise self._exc
        yield  # pragma: no cover — mai raggiunto, serve a rendere il metodo un async generator


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
# 0) Errori provider normalizzati (fix 08/11, Mirko punto 4): la chat non deve
#    morire muta se la chiamata al provider lancia (timeout/HTTP/...).
# ---------------------------------------------------------------------------
def test_provider_error_emesso_non_stream_muto():
    agent = RaisingAgent(TimeoutError("read timed out"))
    out = _collect(agent, "ciao")
    assert out, "lo stream NON deve essere vuoto"
    text = _text_of(out)
    assert "Errore" in text or "Timeout" in text
    assert "Timeout del provider" in text


def test_provider_401_chiave_non_valida():
    agent = RaisingAgent(ValueError("Error code: 401 - Authentication Error"))
    out = _collect(agent, "ciao")
    text = _text_of(out)
    assert "401" in text or "chiave" in text


def test_provider_401_dice_quale_modello():
    """09/11 (Mirko): un 401 deve dire QUALE provider/modello ha fallito.

    Senza il label, il messaggio era indistinguibile quando il test di
    connessione provava una riga e la chat ne usava un'altra (sintomo reale:
    "il test da ok ma la chat dice chiave non valida").
    """
    agent = RaisingAgent(ValueError("Error code: 401 - invalid api key"))
    out = _collect(agent, "ciao")
    text = _text_of(out)
    assert "Provider:" in text, f"manca il provider nel messaggio: {text}"


def test_modello_emesso_come_evento_model():
    """09/11 (Mirko punto 2): la chat deve sapere/mostrare il modello in uso."""
    agent = FakeAgent([[]])
    out = _collect(agent, "ciao")
    model_events = [e for e in out if "[MODEL]" in e]
    assert model_events, "nessun evento [MODEL] emesso"
    # il payload è provider:modello
    payload = model_events[0].split("[MODEL]", 1)[1].strip().strip('"').strip()
    assert ":" in payload or payload == "", f"label inatteso: {payload!r}"


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

# ---------------------------------------------------------------------------
# 09/11 (Mirko, test build): path assoluti fuori workspace e HITL leggibile
# ---------------------------------------------------------------------------
def test_leggi_pdf_path_assoluto_esterno_non_esplode(tmp_path, monkeypatch):
    """Un percorso assoluto (es. D:\\...\\x.pdf) non deve sollevare FileNotFoundError.

    Prima finiva nello stream come "Errore dal provider (FileNotFoundError)".
    Ora: messaggio utile con i file disponibili, così l'agente si corregge.
    """
    monkeypatch.setenv("PDFMIND_WORKSPACE", str(tmp_path))
    (tmp_path / "vero.pdf").write_text("%PDF-1.4\n", encoding="utf-8")
    from app.deep_agent.tools.docs import leggi_pdf

    out = leggi_pdf(r"D:\Mirko\Desktop\non_esiste.pdf")
    assert "file non trovato" in out
    assert "vero.pdf" in out  # elenca cosa c'è davvero


def test_hitl_scrivi_output_dice_cosa_scrive():
    from app.deep_agent.agents.pdfmind import _describe_action

    desc = _describe_action({"name": "scrivi_output", "args": {"nome": "note.txt", "contenuto": "ciao"}}, {}, None)
    assert "note.txt" in desc and "ciao" in desc
    assert "Tool execution requires approval" not in desc


def test_hitl_compress_mostra_il_livello():
    from app.deep_agent.agents.pdfmind import _describe_action

    assert "forte" in _describe_action({"name": "compress_pdf", "args": {"pdf_id": "x.pdf", "quality": "high"}}, {}, None)
    assert "media" in _describe_action({"name": "compress_pdf", "args": {"pdf_id": "x.pdf"}}, {}, None)


def test_prompt_chiede_il_livello_di_compressione():
    from app.deep_agent.agents.pdfmind import SYSTEM_PROMPT

    assert "COMPRESSIONE" in SYSTEM_PROMPT


def test_hitl_scrivi_output_usa_la_conferma_leggibile():
    """09/11 (Mirko): scrivi_output NON deve mostrare più il fallback grezzo
    "Tool execution requires approval Tool: ... Args:{...}": deve usare la stessa
    conferma leggibile degli altri tool (description dinamica)."""
    import app.deep_agent.agents.pdfmind as M

    cfg = M.INTERRUPT_ON["scrivi_output"]
    # è uno schema InterruptOnConfig (dict) con description callable
    assert isinstance(cfg, dict)
    assert "description" in cfg, f"manca description: {cfg}"
    assert callable(cfg["description"])
    desc = cfg["description"]({"name": "scrivi_output", "args": {"nome": "pippo.txt", "contenuto": "hi"}}, None, None)
    assert "pippo.txt" in desc and "hi" in desc
    assert "Args" not in desc and "approval" not in desc.lower()
