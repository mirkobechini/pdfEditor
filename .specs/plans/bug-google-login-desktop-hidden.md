# Bug: Google Login button non visibile nella desktop app

## Contesto

L'utente non vede il pulsante "Accedi con Google" nella desktop app.

## Causa

Il componente `GoogleLoginButton` carica la libreria `@react-oauth/google` con dynamic import solo se `NEXT_PUBLIC_GOOGLE_CLIENT_ID` è impostata:

```typescript
const hasClientId = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
if (hasClientId) {
  const mod = await import("@react-oauth/google");
  setGoogleLogin(() => mod.GoogleLogin);
}
```

Nella desktop app (static export), `process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID` non è disponibile a runtime perché Next.js sostituisce le variabili d'ambiente a build time. Il file `.env` o `.env.local` deve contenere `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

Inoltre, nella desktop app il Google SSO non ha senso perché non c'è backend remoto — il sidecar locale non ha configurazione Google OAuth.

## Fix

1. Aggiungere `NEXT_PUBLIC_GOOGLE_CLIENT_ID` al `.env.desktop` se si vuole Google login anche sulla app web, ma non sul desktop.
2. Oppure: nel componente, se `isTauri()` mostra un messaggio "Google login disponibile solo nella web app" o nasconde il bottone.
3. Verificare che la build statica includa la variabile d'ambiente.

## Priorità

🟢 Bassa — Funzionalità web, non desktop
