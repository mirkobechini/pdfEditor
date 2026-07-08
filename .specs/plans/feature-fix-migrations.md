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

[x] Completata
**Completata il:** 2026-06-25
**Note:** Il commit `bff9c23` ha rimosso le colonne duplicate `is_admin` e `license_tier` dalla migrazione `01fd6e2d14bc`. Migration integrity tests aggiunti (upgrade, downgrade, colonne). PR #54 merged in dev, closes #53.
