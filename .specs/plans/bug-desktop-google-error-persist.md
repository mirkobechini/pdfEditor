# Bug: Errore Google login persiste dopo login email/password (desktop)

## Contesto

Quando si fa login con Google, il pulsante mostra un errore "Google login verrà collegato nel prossimo step backend+OAuth". Se poi si prova a fare login con email/password, l'errore Google rimane visibile.

## Causa

`GoogleLoginButton` ha uno stato `error` interno indipendente dal form. Il submit del form email/password non resetta questo stato.

## Fix

In `login/page.tsx`, aggiungere un reset dell'errore Google all'inizio di `handleSubmit`:

```tsx
const [googleError, setGoogleError] = React.useState<string | null>(null);

async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGoogleError(null);  // ← reset Google error
    ...
}
```

Passare `setGoogleError` a `GoogleLoginButton` come prop, oppure sollevare lo stato errore Google nel componente padre.

## Priorità

🟡 Media — UI bug, non blocca login

## Status

[x] Risolto
**Data:** 2026-07-28
**Issue:** #464
**PR:** #469
