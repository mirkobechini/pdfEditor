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

| File | Tipo | Priorità |
|------|------|----------|
| `bug-desktop-env-google-network.md` | Bug | CRITICAL |
| `bug-google-login-desktop-hidden.md` | Bug | ALTA |
| `bug-guest-solo-desktop.md` | Bug | ALTA |
| `bug-webapp-ui-fixes.md` | Bug | MEDIA |
| `feature-pdf-compression.md` | Feature | MEDIA |
| `feature-email-confirmation.md` | Feature | MEDIA |
| `feature-keep-warm-backend.md` | Feature | BASSA |
| `feature-stripe-mcp-subscriptions.md` | Feature | BASSA |
| `feature-ai-pdf-editing.md` | Feature | BASSA |
| `feature-ui-ux-improvements.md` | Feature | BASSA |
| `feature-license-tier-button-skin.md` | Feature | BASSA |
| `feature-inline-text-editor.md` | Feature | BASSA |
| `feature-authenticated-landing-navigation.md` | Feature | BASSA |
| `feature-audit-mock-pages.md` | Feature | BASSA |
| `hotfix-post-merge-d84befd-stabilization.md` | Hotfix | — |