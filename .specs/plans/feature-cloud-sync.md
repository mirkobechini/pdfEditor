# Feature: Cloud Sync multi-piattaforma (F1)

## Obiettivo

Sync bidirezionale dei PDF tra dispositivo locale e cloud (Neon PostgreSQL + Cloudflare R2) per tutte le piattaforme: web, desktop e mobile.

## Regole base

- **I guest NON hanno cloud sync** — i PDF guest restano solo sul dispositivo
- Solo utenti registrati (email/password) possono sincronizzare
- Sync bidirezionale: locale → cloud e cloud → locale
- UUID come PK già implementato (ADR), `updated_at` timestamp già presente

## Stato attuale

### Backend

- Endpoint API per upload/delete/update PDF già esistenti (`/pdfs/upload`, `/pdfs/{id}`, `/pdfs/{id}/metadata`)
- Sync endpoint: `GET /sync/pull?since=<timestamp>` e `POST /sync/push` (da verificare se esistono)
- PostgreSQL (Neon) per metadati, Cloudflare R2 per storage PDF

### Mobile

- `useSyncQueue` hook già implementato (Task 3 in issue-618) — persistenza coda offline in AsyncStorage
- `user_id` già presente nei PDF locali (Task 3 fix)
- Manca: UI per attivare/disattivare sync (Settings)
- Manca: integrazione useSyncQueue con API cloud

### Web/Desktop

- Sync già implementato (Fase 3 completata) — da verificare allineamento con mobile

## Cosa manca

1. Design dettagliato del flusso sync (quando parte, frequenza, risoluzione conflitti)
2. Verifica endpoint API cloud per sync (`GET /sync/pull`, `POST /sync/push`)
3. UI sync in Settings (toggle on/off, stato ultimo sync)
4. Integrazione `useSyncQueue` con API cloud
5. Gestione conflitti (lock ottimistico già documentato in BRIEF.md)
6. Test su tutte le piattaforme

## Dipendenze

- useSyncQueue hook (mobile) — ✅ completato
- user_id su PDF locali (mobile) — ✅ completato
- API backend cloud — esistente, da verificare
- UI Settings — da implementare

## Status

[ ] Non iniziata — da pianificare nel dettaglio
