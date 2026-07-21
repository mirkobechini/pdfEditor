# Chore: Standardizzazione completa messaggi errore (UX produzione)

**Status:** ✅ Completata in 3 PR (#366, #367, #368)
**Priority:** HIGH
**Complexity:** Medium

## Risultato

- **Backend**: `app/core/errors.py` — 25 codici errore stabili + helper `error_response()`
- **Frontend**: `lib/error-map.ts` — mappa errori → chiavi i18n
- **i18n**: sezioni `common.*` e `pdf.*` in en.json e it.json
- **Backend migrati**: deps.py, auth.py, admin.py, upload.py, convert.py
- **Frontend migrati**: 14 file (tutti i dialoghi, login, register, forgot-password, reset-password, GoogleLoginButton)

## Cosa rimane (PR #369)

### Backend route restanti

- merge_split.py, reorder.py, metadata.py, text.py, unlock.py, undo_redo.py, bug_report.py

### Frontend catch block

- admin/page.tsx (3 alert), Sidebar.tsx, PdfViewer.tsx, app/page.tsx

## Problema attuale

- Messaggi misti (es. prefisso italiano + dettaglio inglese backend)
- Alcuni errori mostrano `err.message` raw (non adatto produzione)
- Mappatura errori diversa tra login, upload, bug report, admin
- Mancanza di codici errore stabili lato API

## Piano (ordinato per priorità)

### 1) Standard error codes backend

Definire codici stabili nel payload errore, ad esempio:

```json
{ "code": "INVALID_CREDENTIALS", "detail": "Invalid email or password" }
```

Codici minimi iniziali:

- `INVALID_CREDENTIALS`
- `RATE_LIMIT`
- `NOT_AUTHENTICATED`
- `FORBIDDEN`
- `PDF_NOT_FOUND`
- `PDF_FILE_NOT_FOUND`
- `UPLOAD_TOO_LARGE`
- `INVALID_PDF`
- `NETWORK_ERROR` (frontend-only)
- `UNKNOWN_ERROR`

### 2) Mapper centralizzato frontend

Creare `frontend/src/app/lib/error-map.ts` con funzione unica:

- input: status/code/message raw
- output: chiave i18n coerente

Usare il mapper in tutti i `catch` lato UI.

### 3) i18n completa IT/EN

Aggiungere chiavi in `frontend/messages/it.json` e `frontend/messages/en.json`:

- `common.networkError`
- `common.unknownError`
- `common.rateLimitExceeded`
- `auth.invalidCredentials`
- `auth.notAuthenticated`
- `pdf.notFound`
- `pdf.fileNotFound`
- `pdf.uploadTooLarge`
- `pdf.invalidPdf`
- `admin.fetchUsersFailed`
- `bugReport.submitFailed`

### 4) UI error handling uniforme

Regole:

- Mai concatenare testo tradotto + raw backend (`"Accesso fallito: " + err.message`)
- Sempre mostrare messaggio tradotto user-friendly
- Log tecnico completo solo in console/dev

Applicare a:

- `login/page.tsx`
- `register/page.tsx`
- `forgot-password/page.tsx`
- `reset-password/page.tsx`
- `components/Sidebar.tsx`
- `components/BugReportDialog.tsx`
- `app/admin/page.tsx`
- dialog PDF (`Merge/Split/Reorder/Remove/Metadata/Replace/Protect`)

### 5) Rate-limit UX dedicata (429)

Gestire 429 con messaggio specifico e consistente:

- IT: `Troppi tentativi. Riprova tra un minuto.`
- EN: `Too many attempts. Please try again in a minute.`

Endpoint minimi:

- `/auth/login`
- `/auth/register`
- `/auth/forgot-password`
- `/auth/google`
- submit/search/vote bug report (se limitati)

### 6) Test regressione error UX

Aggiungere test per:

- mapping `code/status -> i18n key`
- fallback su errore sconosciuto
- casi 401/403/404/413/422/429/500
- `TypeError: Failed to fetch` (network/CORS)

### 7) Documentazione e allineamento

- Aggiornare ADR in sezione decisioni tecniche (error handling)
- Aggiornare questo file a `✅ Completata` quando chiuso
- Inserire riferimento a PR e data

## Criteri di accettazione

- Nessun messaggio errore misto IT/EN in UI
- Nessun dettaglio tecnico raw visibile all’utente finale
- Rate limit 429 sempre con messaggio user-friendly
- Mapping errori centralizzato e riusato
- Test error UX verdi

## Note implementative

- Evitare breaking change immediate: introdurre `code` mantenendo `detail`
- Migrazione graduale per schermata/modulo, iniziando da auth e upload/download
- Priorità operativa: Auth → Sidebar/PDF → Admin/BugReport → resto dialog
