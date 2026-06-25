# Feature: Fix migrazioni Alembic

## Obiettivo

Risolvere la migrazione `01fd6e2d14bc` che duplica colonne (`is_admin`, `license_tier`) già aggiunte in `7ffbd97b3386`, permettendo ad `alembic upgrade head` di eseguire senza errori.

## Dipendenze

Nessuna — è un fix sul database layer.

## Stack

- Alembic
- SQLAlchemy 2.0
- SQLite

## Output atteso

- `alembic upgrade head` esegue senza errori
- Le colonne duplicate sono rimosse dalla migration incriminata
- Test che verifica lo stato finale del database

## Status

[ ] Non iniziata
