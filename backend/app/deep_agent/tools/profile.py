"""Selezione tool per profilo — Decisioni ADR 1-2: user = solo documenti; dev = documenti+manutenzione."""

from app.deep_agent.tools import dev, docs, workspace

_DOC = [docs.elenca_file, docs.leggi_pdf, docs.riassumi_pdf, docs.estrai_date, docs.confronta_versioni]
_WS = [workspace.elenca_workspace, workspace.leggi_workspace, workspace.scrivi_output]
_DEV = [dev.git_status, dev.leggi_log, dev.api_status, dev.leggi_issue]


def get_tools(profile: str = "user") -> list:
    if profile == "dev":
        return _DOC + _WS + _DEV
    return list(_DOC) + list(_WS)