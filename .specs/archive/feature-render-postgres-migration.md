# Feature: Migrazione database Render da SQLite a PostgreSQL

**Status:** ✅ Completata (2026-07-08)

## Obiettivo

Migrare il backend deployato su Render da SQLite (ephemeral) a PostgreSQL persistente per evitare perdita utenti/dati ai redeploy.

## Dipendenze

- Servizio PostgreSQL creato su Render
- Variabile `DATABASE_URL` del backend aggiornata con connection string Postgres
- Alembic migrations allineate e applicabili su Postgres

## Stack

- FastAPI
- SQLAlchemy 2.0
- Alembic
- PostgreSQL (Render)

## Output atteso

- Backend usa PostgreSQL in produzione (`DATABASE_URL` Postgres)
- Tabelle create/migrate via Alembic su nuovo DB
- Utenti e dati persistono tra deploy/restart
- Seed super admin continua a funzionare su startup
- Checklist di rollback definita (ripristino env + DB precedente)

## Status

[x] Completata
**Completata il:** 2026-07-01
**Note:** PostgreSQL service creato su Render, backend connesso con psycopg v3, migrations applicate automaticamente, persistenza confermata. La migration è stata applicata come parte del deploy su Render — il backend ora usa `DATABASE_URL` Postgres in produzione.

## Implementazione proposta (step by step)

1. Creare istanza PostgreSQL su Render e recuperare Internal Database URL.
2. Configurare `DATABASE_URL` nel backend Render con URL Postgres.
3. Eseguire migrations Alembic sul nuovo DB (startup o job dedicato).
4. Verificare schema completo (`users`, `pdf_documents`, `license_features`, `bug_reports`, ecc.).
5. Testare flussi critici in produzione: register/login, seed super admin, upload/list PDF.
6. Configurare backup policy e retention del DB Render.
7. Documentare procedura operativa e rollback in README/ADR.
