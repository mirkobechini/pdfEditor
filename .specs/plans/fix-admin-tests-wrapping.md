# Fix: Broken Admin Tests After UserListResponse Wrapping + Deprecation Warnings

**Issue Number**: issue-145

## Obiettivo

Fixare 5 test che falliscono perché il backend ora restituisce `{ items, total }` per `GET /admin/users` e `GET /admin/bugs`, ma i test cercano ancora una risposta flat (lista diretta).

## Problema

- `backend/app/api/v1/admin.py` restituisce `UserListResponse(items=[...], total=N)` dalla PR #126/#128
- `backend/app/api/v1/bug_report.py` restituisce `BugListResponse(items=[...], total=N)` dalla PR #126/#128
- I test in `test_license.py` (4 test) e `test_bug_report.py` (1 test) non sono stati aggiornati
- Falliscono con `TypeError: string indices must be integers, not 'str'` o `ResponseValidationError`

## Test da fixare

**test_license.py::TestAdmin:**
| Test | Problema |
|---|---|
| `test_admin_update_license` | `users_resp.json()` è `{ items, total }` ma test usa `[u["id"] for u in data]` |
| `test_admin_update_license_invalid_tier` | Stesso problema |
| `test_admin_update_is_admin` | Stesso problema |
| `test_admin_update_is_admin_denied_for_non_admin` | Stesso problema |

**test_bug_report.py::TestAdminBugs:**
| Test | Problema |
|---|---|
| `test_list_bugs_admin` | `response` valida ma `BugListResponse` wrapped, test non aggiornato |

## Fix

Per ogni test:

- `users_resp.json()["items"]` invece di `users_resp.json()`
- `response.json()["items"]` per admin/bugs

## Dipendenze

- `backend/tests/test_license.py` — 4 test admin
- `backend/tests/test_bug_report.py` — 1 test admin bugs

## Stack

- Backend: pytest

## Output atteso

✅ 5 test fixati → 123/123 test passano

## Accettazione Criteria

- [x] test_admin_update_license passa
- [x] test_admin_update_license_invalid_tier passa
- [x] test_admin_update_is_admin passa
- [x] test_admin_update_is_admin_denied_for_non_admin passa
- [x] test_list_bugs_admin passa
- [x] Full suite: `python -m pytest tests/ -v --tb=no` = 123 passed, 0 failed
- [x] Deprecation warnings: 6 → 1 (solo httpx2 esterno)

## Status

- [ ] Non iniziata
- [ ] In progress
- [ ] In review
- [x] ✅ Completata (merged to dev - PR #141)

## Timeline

Stimato: 10 minuti

## Note

- Errore pre-esistente, non causato dal nostro lavoro su #138
- Fix semplice: aggiungere `["items"]` dopo `.json()`
