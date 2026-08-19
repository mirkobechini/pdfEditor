# .specs/ — Project Specification & Planning

Questa directory contiene tutta la documentazione di pianificazione del progetto.

## Struttura

```
.specs/
├── README.md           ← Questo file
├── active/             ← Feature, bug, chore ancora da fare (~15 file)
└── archive/            ← Tutti i file completati (~141 file, storico)
```

## Regole

- **`active/`** contiene solo task ancora da implementare. Ogni file è un task autonomo.
- **`archive/`** contiene task completati — non modificare, solo consultazione storica.
- Quando inizi un nuovo task, **crea il file in `active/`** (o sposta da `archive/` se ripreso).
- Quando completi un task, **sposta il file in `archive/`**.

## Active (da fare)

| File                                   | Tipo    | Priorità | Piattaforma |
| -------------------------------------- | ------- | -------- | ----------- |
| `feature-cloud-sync-desktop.md`        | Feature | ALTA     | Desktop     |
| `feature-google-oauth-desktop-page.md` | Feature | MEDIA    | Desktop     |
| `bug-login-401-neon.md`                | Bug     | ALTA     | Web/Dekstop |
| `feature-pdf-compression.md`           | Feature | MEDIA    | Web/Dekstop |
| `feature-email-confirmation.md`        | Feature | MEDIA    | Web         |
| `feature-keep-warm-backend.md`         | Feature | BASSA    | Web/Dekstop |
| `feature-stripe-mcp-subscriptions.md`  | Feature | BASSA    | Web/Dekstop |
| `feature-ai-pdf-editing.md`            | Feature | BASSA    | Web/Dekstop |
| `feature-ui-ux-improvements.md`        | Feature | BASSA    | Web         |
| `feature-license-tier-button-skin.md`  | Feature | BASSA    | Web/Dekstop |
| `feature-inline-text-editor.md`        | Feature | BASSA    | Web/Dekstop |
| `tech-e2e-tests.md`                    | Tech    | MEDIA    | Tutte       |
| `tech-password-cache-global.md`        | Tech    | BASSA    | Backend     |
