# Bug: Due icone "mostra password" nel login

## Contesto

Il componente `PasswordInput` ha una sola icona toggle, ma l'utente ne vede due.

## Causa probabile

La `login/page.tsx` usa `PasswordInput` per la password, ma c'è anche il campo `password` in `register/page.tsx`. Potrebbe essere un duplicato visivo dovuto a CSS/styling (es. icona nativa del browser + icona React).

## Fix

- Verificare se è il browser che aggiunge il suo own toggle password (Chrome/etc.) in conflitto con quello React
- Disabilitare il native password toggle con CSS: `input[type="password"]::-ms-reveal { display: none }` e `::-webkit-credentials-auto-fill-button`
- Se invece è un doppio componente React: rimuovere il duplicato

## Priorità

🟡 Media — UI bug, non blocca funzionalità
