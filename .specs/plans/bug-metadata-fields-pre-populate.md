# Bug Fix Plan: Metadata Fields Pre-Population

**Status:** Planning
**Priority:** ALTA (UX Bug)
**Severity:** Medium
**Complexity:** Low
**Estimated Time:** 1-2 hours

---

## Problem Statement

Quando l'utente apre il dialog **Metadata**, i campi (Title, Author, Subject, Keywords) appaiono **vuoti** anche quando il PDF ha metadati correnti. L'utente deve sovrascrivere manualmente, perdendo i valori originali.

**Osservato in:**

- MetadataDialog su qualsiasi PDF con metadati

**Impatto:**

- UX confusa: utente pensa i metadati non esistano
- Rischio di perdita dati: se l'utente modifica solo un campo, deve ricordarsi gli altri
- Workaround: aprire PDF in altro reader per vedere metadati

---

## Root Cause Analysis

### Frontend

Il codice in `MetadataDialog.tsx` ha già la logica per popolare i campi:

```tsx
const data = await api.getMetadata(pdfId);
setTitle(data.title || "");
setAuthor(data.author || "");
setSubject(data.subject || "");
setKeywords(data.keywords || "");
```

Possibili cause:

1. **Race condition nel useEffect** — `loadMetadata()` è chiamato in useEffect, ma potrebbe non completarsi prima del render
2. **Backend non ritorna metadati** — `GET /pdfs/{id}/metadata` potrebbe ritornare oggetto vuoto se il PDF non ha metadati
3. **Il PDF non ha metadati nativamente** — Molti PDF non hanno title/author/subject/keywords impostati
4. **Errore API silenzioso** — `catch` setta errore ma i campi rimangono vuoti
5. **useEffect dependency mancante** — `open` + `pdfId` potrebbe non triggerare refresh se già uguali

### Backend

```python
# backend/app/api/v1/pdfs.py
@router.get("/{pdf_id}/metadata")
def get_metadata(pdf_id: str, ...):
    pdf = service.get(pdf_id)
    # PyMuPDF metadata extraction
    return pdf.metadata  # Potrebbe essere vuoto
```

Possibili cause:

1. PyMuPDF ritorna metadati null/vuoti per alcuni PDF
2. Endpoint non popola correttamente i campi
3. PDF non ha metadati embedded

---

## Test Checklist

- [ ] Aprire dialog Metadata su PDF con metadati → campi pre-popolati
- [ ] Aprire dialog Metadata su PDF senza metadati → campi vuoti (corretto)
- [ ] Modificare campo e salvare → metadati aggiornati
- [ ] Riaprire dialog → campi pre-popolati con nuovi valori
- [ ] Provare su PDF creati da merge/split/reorder

---

## Acceptance Criteria

- [ ] Quando si apre MetadataDialog, i campi mostrano i valori correnti del PDF
- [ ] Se il PDF non ha metadati, i campi restano vuoti (nessun placeholder fuorviante)
- [ ] Dopo salvataggio e riapertura, i campi mostrano i nuovi valori
- [ ] Funziona su PDF creati da merge/split/reorder/upload

---

## Files to Modify

**Frontend:**

- `frontend/src/app/components/MetadataDialog.tsx` — Verificar corretto funzionamento pre-population

**Backend:**

- `backend/app/api/v1/pdfs.py` — Verificare che GET /pdfs/{id}/metadata ritorni metadati effettivi

---

## Definition of Done

- ✅ Bug riprodotto e fixato
- ✅ Test manuale: metadati sempre pre-popolati
- ✅ PR mergiata su dev
- ✅ ADR e plan aggiornati
