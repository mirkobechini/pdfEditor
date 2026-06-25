# Feature: PDF protetti da password (rilevamento + UI)

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

[ ] Non iniziata
