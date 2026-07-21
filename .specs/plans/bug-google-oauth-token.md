# Bug: Google OAuth - Invalid or expired token + origin_mismatch

**Status:** ✅ Completata (2026-07-15, PR #347)
**Priority:** HIGH
**Complexity:** Medium

## Problemi

1. **origin_mismatch** — L'URL del frontend su Render/Cloudflare non è registrato in Google Cloud Console come Authorized JavaScript origin
2. **Invalid or expired token** — Il token Google ricevuto non viene validato correttamente dal backend
3. **Login password non riconosciuta** — Dopo migration, forse l'utente esiste ma la password non matcha

## Soluzione

### 1. Google Cloud Console

Aggiungere come Authorized JavaScript origins:

- `https://pdeditor-frontend.onrender.com`
- `https://pdfeditor.mirkobechini.com`

### 2. Backend — Debug Google token

```python
# backend/app/services/auth_service.py
# Aggiungere log del token ricevuto e della risposta Google
import logging
logger = logging.getLogger("pdfeditor")
logger.debug("Google token received: %s...", id_token[:20])
```

### 3. Verifica utente esistente

Controllare se l'utente `mirkobechini@gmail.com` esiste nel DB PostgreSQL su Render e se la password è stata preservata dopo le migration.
