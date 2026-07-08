# API Endpoints Reference

Tutti gli endpoint sono su router con `prefix="/pdfs"` e protetti da JWT.

## Autenticazione

| Metodo | Path                    | Descrizione                  |
| ------ | ----------------------- | ---------------------------- |
| POST   | `/auth/register`        | Registrazione utente         |
| POST   | `/auth/login`           | Login (restituisce JWT)      |
| GET    | `/auth/me`              | Profilo utente corrente      |
| POST   | `/auth/forgot-password` | Richiedi reset password      |
| POST   | `/auth/reset-password`  | Reimposta password con token |

## PDF — CRUD

| Metodo | Path                  | Descrizione           |
| ------ | --------------------- | --------------------- |
| GET    | `/pdfs`               | Lista PDF dell'utente |
| POST   | `/pdfs/upload`        | Carica nuovo PDF      |
| GET    | `/pdfs/{id}`          | Ottieni metadati PDF  |
| DELETE | `/pdfs/{id}`          | Elimina PDF           |
| GET    | `/pdfs/{id}/download` | Scarica file PDF      |

## PDF — Modifica

| Metodo | Path                      | Descrizione                             |
| ------ | ------------------------- | --------------------------------------- |
| POST   | `/pdfs/merge`             | Unisce più PDF                          |
| POST   | `/pdfs/{id}/split`        | Divide un PDF (mode: `every` o `range`) |
| POST   | `/pdfs/{id}/reorder`      | Riordina pagine                         |
| POST   | `/pdfs/{id}/remove-pages` | Rimuove pagine                          |
| POST   | `/pdfs/{id}/replace-text` | Cerca e sostituisce testo               |
| GET    | `/pdfs/{id}/text`         | Estrae testo (page opzionale)           |

## PDF — Metadati

| Metodo | Path                  | Descrizione       |
| ------ | --------------------- | ----------------- |
| GET    | `/pdfs/{id}/metadata` | Legge metadati    |
| PUT    | `/pdfs/{id}/metadata` | Aggiorna metadati |

## PDF — Esporta / Importa

| Metodo | Path                | Descrizione                     |
| ------ | ------------------- | ------------------------------- |
| POST   | `/pdfs/{id}/export` | Esporta in TXT/PNG/JPG/SVG      |
| POST   | `/pdfs/import`      | Importa file TXT/immagine → PDF |

## PDF — Unlock

| Metodo | Path                | Descrizione                      |
| ------ | ------------------- | -------------------------------- |
| POST   | `/pdfs/{id}/unlock` | Sblocca PDF protetto da password |

## PDF — Undo/Redo

| Metodo | Path              | Descrizione                          |
| ------ | ----------------- | ------------------------------------ |
| POST   | `/pdfs/{id}/undo` | Annulla ultima modifica              |
| POST   | `/pdfs/{id}/redo` | Ripristina ultima modifica annullata |

## Admin

| Metodo | Path                            | Descrizione                   |
| ------ | ------------------------------- | ----------------------------- |
| GET    | `/admin/users`                  | Lista utenti                  |
| PUT    | `/admin/users/{id}/license`     | Cambia tier licenza           |
| GET    | `/admin/users/{id}/bug-reports` | Lista bug report di un utente |
| GET    | `/admin/bug-reports`            | Lista tutti i bug report      |
| PUT    | `/admin/bug-reports/{id}`       | Modifica stato bug report     |

## Bug Report

| Metodo | Path           | Descrizione                        |
| ------ | -------------- | ---------------------------------- |
| POST   | `/bug-reports` | Invia bug report                   |
| GET    | `/bug-reports` | Lista bug report (utente corrente) |

## Tipico pattern endpoint

```python
@router.post("/{pdf_id}/operation", response_model=ResponseSchema)
def operation_name(
    pdf_id: str,
    req: RequestSchema,
    current_user: User = Depends(verify_feature_access("feature_key")),
    service: YourService = Depends(get_your_service),
) -> ResponseSchema:
    try:
        pdf = service.method_name(pdf_id, current_user.id, ...)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return ResponseSchema.model_validate(pdf)
```
