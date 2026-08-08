# Bug: Sidecar crash su Windows — pydantic extra fields in .env.desktop

## Contesto

Alla prima installazione su Windows 11, il sidecar `fastapi-sidecar.exe` crasha subito con:

```
pydantic_core.ValidationError: 3 validation errors for Settings
next_public_google_client_id → Extra inputs are not permitted
sidecar_port → Extra inputs are not permitted
storage_local_path → Extra inputs are not permitted
```

La causa è che `.env.desktop` viene copiato → `.env` → letto da `pydantic_settings` che di default `extra='forbid'`. Le 3 variabili non sono campi validi del modello `Settings` e causano ValidationError.

## Variabili coinvolte

| Variabile                      | Necessaria?                   | Usata da                                    |
| ------------------------------ | ----------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Solo frontend (build-time)    | `ClientLayout.tsx`, `GoogleLoginButton.tsx` |
| `SIDECAR_PORT`                 | Sì, ma letta via `os.environ` | `run_backend.py` (non via Settings)         |
| `STORAGE_LOCAL_PATH`           | Mai usata                     | Nessuno                                     |

## Fix

Rimuovere TUTTE e 3 da `.env.desktop`. Le variabili non servono al backend Settings model e vanno gestite diversamente.

## Verifica

Dopo il fix:

1. Build sidecar locale: `pyinstaller ... run_backend.py`
2. Avviare sidecar: `./dist/fastapi-sidecar.exe`
3. Verificare che non ci siano ValidationError
4. Verificare che l'health check sulla porta 7723 risponda

## Priorità

🔴 **Alta** — Blocca l'app desktop su Windows.
