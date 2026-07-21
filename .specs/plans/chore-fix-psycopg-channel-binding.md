# Chore: fix psycopg channel_binding in local PostgreSQL tests

## Problema
4 test in `tests/test_edge_cases.py` falliscono in locale:
- `test_run_migrations`
- `test_seed_super_admin`
- `test_seed_license_features`
- `test_main_seed_license_features_already_seeded`

**Errore:** `sqlalchemy.exc.ProgrammingError: (psycopg.ProgrammingError) invalid connection option "channel_binding"`

## Causa
La versione locale di `psycopg` (o `psycopg-binary`) non supporta il parametro `channel_binding` che viene passato automaticamente da SQLAlchemy quando si connette a PostgreSQL. Il problema è specifico dell'ambiente locale (Windows, Python 3.14) — in CI non si verifica.

## Fix proposto
1. Aggiornare `psycopg` / `psycopg-binary` all'ultima versione in `requirements.txt`
2. Se non basta, verificare la configurazione di `DATABASE_URL` nei test o aggiungere `?channel_binding=prefer` alla connection string
3. In alternativa, mockare le connessioni PostgreSQL nei test che non necessitano di un DB reale

## Status
[ ] Non iniziata