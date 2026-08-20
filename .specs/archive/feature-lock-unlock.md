# Feature: Lock/Unlock PDF Dialog (Desktop)

## Obiettivo

Sostituire il bottone mock "LOCK" nella sidebar Fast Actions con un modale funzionante che permetta di crittografare (LOCK) e decrittografare (UNLOCK) un PDF con password.

## Dipendenze

- Backend API già esistenti: `POST /pdfs/{id}/protect` e `POST /pdfs/{id}/unlock`
- `api.protectPdf()` e `api.unlockPdf()` già in shared/api.ts
- `PdfDocument.is_password_protected` già in types.ts

## Stack

- Frontend: Next.js + React + Tailwind (desktop/frontend)
- Backend: FastAPI + PyMuPDF (fitz) — già implementato

## Modifiche necessarie

### Frontend

1. **`desktop/frontend/src/components/LockUnlockModal.tsx`**: Nuovo componente modale con:
   - Se PDF non protetto → campo password + conferma + bottone "Lock"
   - Se PDF protetto → campo password + bottone "Unlock"
   - Dopo unlock, refresh del PDF viewer (ricarica senza password)
   - Dopo lock, refresh del PDF viewer

2. **`desktop/frontend/src/app/app/page.tsx`**: Wired del modale (sidebar Fast Actions + header)

## Output atteso

- Bottone LOCK nella sidebar apre il modale (Lock se non protetto, Unlock se protetto)
- Bottone LOCK nell'header (stessa logica)
- Lock funzionante con AES-256
- Unlock funzionante con cache password in memoria
- Refresh della lista documenti e del viewer dopo l'operazione

## Note per implementazioni future

### Overlay PDF protetto da password (TODO)

Quando un PDF è protetto (`is_password_protected = true`) e NON è stato ancora sbloccato, il download endpoint restituisce `403 PDF_LOCKED`. Invece di mostrare un viewer bianco, bisogna mostrare un overlay con:

- Icona lucchetto
- Messaggio "PDF protetto da password"
- Bottone "Unlock" che apre il LockUnlockModal
- Dopo unlock, ricaricare il PDF (refresh del viewer)

**Va implementato su**:

- [ ] Desktop (`desktop/frontend/src/app/app/page.tsx`)
- [ ] Webapp (`frontend/src/app/app/page.tsx`)
- [ ] Mobile (`mobile/`)

## Status

[ ] Non iniziata
