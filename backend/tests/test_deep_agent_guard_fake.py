"""GUARD anti-fake (21/10) — l'utente chiede un'operazione ma nessun tool operativo è stato chiamato.

Verifica la funzione pura `_wants_operation` e il set `OPERATIVE_TOOLS` di
`app.deep_agent.server.mind`: il guard emette "NON eseguito" quando il messaggio
utente chiede un'operazione ma in quel turno nessuno strumento operativo è stato
chiamato (esiti finti tipo "fatto/eliminato/unito" senza chiamata tool).
"""

from app.deep_agent.server.mind import OPERATIVE_TOOLS, _wants_operation


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
        "che file vedi nel workspace?",
        "elenca i file",
        "riassumi questo pdf",
        "leggi nota-prova.txt",
        "quanti file ci sono?",
        "ciao",
    ]
    for g in read_goals:
        assert not _wants_operation(g), f"atteso False per: {g!r}"