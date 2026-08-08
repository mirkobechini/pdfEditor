# Feature Plan: Bug Report De-duplication & Voting System

**Status:** ✅ Completata (2026-07-12, PR #252)
**Priority:** MEDIA (UX Improvement)
**Complexity:** Medium
**Estimated Time:** 4-6 ore

---

## Obiettivo

Evitare che lo stesso bug venga segnalato da più utenti con titoli diversi. Un utente che vuole segnalare un bug vede prima quelli esistenti e può "votare" (aggiungersi alla segnalazione), incrementando un contatore. Admin risolve una volta per tutte.

## Soluzione

### Backend

#### 1. Modello — Aggiungere campo `report_count`

```python
# backend/app/models/bug_report.py
class BugReport(Base):
    __tablename__ = "bug_reports"
    # ... campi esistenti ...
    report_count: int = Column(Integer, default=1)  # nuovi
```

#### 2. Endpoint: `GET /bugs/search?q=<query>`

Prima di creare un bug, l'utente cerca: restituisce bug aperti con titolo/descrizione simili (LIKE %query%).

#### 3. Endpoint: `POST /bugs/{id}/vote`

Incrementa `report_count` del bug. Se l'utente ha già votato, restituisce errore.

#### 4. Admin resolve — Update status su bug originale

Nessuna modifica; già funziona. Il `report_count` mostra quante persone hanno lo stesso problema.

### Frontend

#### 1. BugReportDialog — Step 1: Ricerca bug esistenti

Prima di mostrare il form di creazione, mostra un campo di ricerca. Se trova bug aperti esistenti, li elenca con:

- Titolo, descrizione troncata, `report_count`
- Bottone "Anche io" → chiama `POST /bugs/{id}/vote`
- Bottone "Nessuno di questi, crea nuovo" → mostra form

#### 2. Profilo utente — Mostra `report_count` nei bug dell'utente

## Test

- Backend: 2 nuovi test per search, 2 per vote
- Frontend: aggiornare test BugReportDialog
