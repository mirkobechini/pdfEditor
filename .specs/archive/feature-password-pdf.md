# Feature: PDF protetti da password (rilevamento + UI)

**Status:** ✅ Completata (2026-07-01)

## Obiettivo

Implementare rilevamento automatico di PDF criptati all'upload, modale per richiesta password, e gestione password di sessione.

## Dipendenze

- Backend API upload ✅
- Frontend viewer ✅

## Stack

- PyMuPDF (fitz)
- React 19

## Output atteso

- All'upload, PyMuPDF rileva se il PDF è criptato e restituisce `requires_password: true`
- Se il PDF è protetto, la toolbar mostra un modale "Questo PDF è protetto — inserisci password"
- API endpoint di apertura accetta campo `password` opzionale; se omessa e file protetto → 403 + flag
- Password tenuta in memoria per la sessione (non su disco)
- Se password errata, errore UI e possibilità di riprovare

## Status

[x] Completata
**Completata il:** 2026-06-27
**Note:** Rilevamento automatico PDF criptati in upload. Endpoint `POST /pdfs/{id}/unlock` con cache password in memoria (dict `_password_cache`). Modale password in PdfViewer. Migration `6c82d728bff3`. 193 test passanti (107 backend + 86 frontend). (PR #96, issue #95)
