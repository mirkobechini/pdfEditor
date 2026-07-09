# Feature: PDF Lock (Protect with Password)

**Issue Number**: issue-150

## Obiettivo

Aggiungere funzionalità per proteggere un PDF con password (lock). Attualmente esiste solo unlock.

## Problema

- `POST /pdfs/{id}/unlock` esiste e funziona
- ❌ Nessun endpoint `POST /pdfs/{id}/protect` per applicare password
- ❌ Nessuna UI frontend per proteggere PDF
- ❌ Nessun pulsante "Protect" in toolbar

## Dipendenze

- `backend/app/api/v1/unlock.py` — Aggiungere endpoint `POST /pdfs/{id}/protect`
- `backend/app/services/pdf_service.py` — Aggiungere metodo `protect()`
- `frontend/src/app/lib/api.ts` — Aggiungere `api.protectPdf(id, password)`
- `frontend/src/app/components/ProtectDialog.tsx` (nuovo)
- `frontend/src/app/components/Toolbar.tsx` — Pulsante "Protect"
- `frontend/src/app/page.tsx` — Handler
- `frontend/messages/en.json` e `it.json` — Chiavi traduzione

## Stack

- Backend: FastAPI + PyMuPDF
- Frontend: React 19 + TypeScript

## Output atteso

✅ Backend:

1. `POST /pdfs/{id}/protect` con body `{ password: string }`
2. Usa `fitz.open()` + `doc.save(encryption=PDF_ENCRYPT_AES_256, user_pw=password)`
3. Aggiorna `is_password_protected = True` nel DB
4. Rilegge il file salvato con password

✅ Frontend:

1. `ProtectDialog` con campo password + conferma
2. Pulsante "Protect" nella toolbar (solo quando PDF selezionato)
3. Traduzioni IT/EN

## Accettazione Criteria

- [ ] Endpoint `POST /pdfs/{id}/protect` nel backend
- [ ] `pdf_service.protect()` implementato
- [ ] `api.protectPdf()` in api.ts
- [ ] ProtectDialog.tsx creato
- [ ] Toolbar ha pulsante Protect
- [ ] Test backend: protect + unlock funzionano
- [ ] Full suite test passa

## Status

[x] Completata
**Completata il:** 2026-07-02
**Note:** Endpoint `POST /pdfs/{id}/protect` in backend, `pdf_service.protect()` con `PDF_ENCRYPT_AES_256`. ProtectDialog con password+conferma, pulsante "Protect" in Toolbar, chiavi i18n protectDialog in en.json/it.json.

- [ ] Non iniziata
- [ ] In progress
- [ ] In review
- [ ] Completata

## Timeline

Stimato: 1 ora
