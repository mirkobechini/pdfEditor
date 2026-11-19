"""GUARD anti-fake + ORCHESTRAZIONE (21/10) — l'utente chiede un'operazione/elenco
ma il modello non chiama nessun tool (esiti finti tipo "fatto/eliminato/unito").

Il guard lato server (mind.py) emette "NON eseguito"; l'orchestrazione
(ForceToolCallMiddleware in pdfmind.py) RESTRINGE i tool offerti al modello e
forza `tool_choice` così la chiamata allo strumento avviene davvero.
Le funzioni di intent vivono in `agents/pdfmind.py` e vengono riusate dal server.
"""

from app.deep_agent.agents.pdfmind import (
    ForceToolCallMiddleware,
    _describe_action,
    _forced_tools_for_goal,
    _is_capability_question,
    _is_positive_confirmation,
    _wants_listing,
    _wants_operation,
    _wants_tool,
)
from app.deep_agent.server.mind import OPERATIVE_TOOLS


def test_operative_tools_include_action_tools() -> None:
    # Tutti i tool che ESEGUONO un'operazione reale sui file devono essere nel set.
    for t in ("merge_pdfs", "split_pdf", "sign_pdf", "annotate_pdf",
              "ocr_pdf", "compress_pdf", "convert_docx_to_pdf",
              "scrivi_output", "elimina_file"):
        assert t in OPERATIVE_TOOLS, f"{t} manca da OPERATIVE_TOOLS"


def test_wants_operation_true_for_action_requests() -> None:
    operation_goals = [
        "unisci questi pdf",
        "puoi unire scheda_1726 e temp?",
        "firmami documento",
        "separa il file in due",
        "comprimi il pdf",
        "converti il docx in pdf",
        "elimina nota-prova.txt",
        "scrivi una nota di prova",
        "cancella il file",
        "fai l'ocr su questo documento",
    ]
    for g in operation_goals:
        assert _wants_operation(g), f"atteso True per: {g!r}"


def test_wants_operation_false_for_read_only_requests() -> None:
    read_goals = [
        "quanti file ci sono?",
        "ciao",
    ]
    for g in read_goals:
        assert not _wants_operation(g), f"atteso False per: {g!r}"


def test_wants_listing_true_for_list_requests() -> None:
    listing_goals = [
        "elenca i file",
        "elencami i file nella workspace",
        "che file vedi nel workspace?",
        "quali file ci sono?",
    ]
    for g in listing_goals:
        assert _wants_listing(g), f"atteso True per: {g!r}"


def test_wants_tool_true_for_actions_and_listings() -> None:
    for g in ("unisci questi pdf", "elenca i file", "elimina nota-prova.txt"):
        assert _wants_tool(g), f"atteso True per: {g!r}"


def test_wants_tool_false_for_chitchat() -> None:
    for g in ("ciao", "grazie", "chi sei?", "come funziona il programma?"):
        assert not _wants_tool(g), f"atteso False per: {g!r}"


def test_forced_tools_for_goal_restricts_surface() -> None:
    # Verifica che per un'operazione la surface venga ristretta AI SOLI tool pertinenti.
    class _T:
        def __init__(self, name: str) -> None:
            self.name = name

    all_tools = [_T(n) for n in OPERATIVE_TOOLS] + [_T("elenca_workspace"), _T("leggi_workspace")]
    forced = _forced_tools_for_goal("unisci temp e scheda", all_tools)
    assert [t.name for t in forced] == ["merge_pdfs"]
    forced2 = _forced_tools_for_goal("elenca i file", all_tools)
    assert [t.name for t in forced2] == ["elenca_workspace"]


def test_is_positive_confirmation() -> None:
    assert _is_positive_confirmation("va bene")
    assert _is_positive_confirmation("sì")
    assert _is_positive_confirmation("si")
    assert _is_positive_confirmation("ok")
    assert _is_positive_confirmation("procedi")
    assert _is_positive_confirmation("unisci anche quello")
    assert not _is_positive_confirmation("no")
    assert not _is_positive_confirmation("annulla")
    assert not _is_positive_confirmation("unisci temp e scheda")
    assert not _is_positive_confirmation("")


def test_is_capability_question() -> None:
    assert _is_capability_question("puoi eliminare dei file?")
    assert _is_capability_question("sai unire i pdf?")
    assert not _is_capability_question("elimina pippo.pdf")
    assert not _is_capability_question("unisci temp e scheda-1726")
    # la domanda di capacità NON deve contare come operazione
    assert not _wants_operation("puoi eliminare dei file?")
    assert not _wants_tool("puoi eliminare dei file?")


def test_describe_action_mentions_files() -> None:
    d = _describe_action({"name": "merge_pdfs", "args": {"pdf_ids": ["temp", "scheda-1726"]}}, None, None)
    assert "temp" in d and "scheda-1726" in d
    assert "uniti" in d  # nome del file risultante
    d2 = _describe_action({"name": "elimina_file", "args": {"rel": "pippo.pdf"}}, None, None)
    assert "pippo.pdf" in d2


def test_force_tool_call_middleware_has_documented_hooks() -> None:
    mw = ForceToolCallMiddleware()
    assert getattr(mw, "name", "") == "force_tool_call"
    # hook documentati (deepagents): wrap_model_call E awrap_model_call (path async del server).
    assert callable(getattr(mw, "wrap_model_call", None))
    assert callable(getattr(mw, "awrap_model_call", None))