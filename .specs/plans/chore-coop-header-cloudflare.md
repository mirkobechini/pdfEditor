# Chore: Set Cross-Origin-Opener-Policy header for Google SSO popup

**Issue:** #387

## Problema

Il popup di Google OAuth (`accounts.google.com`) non riesce a comunicare con la finestra principale via `window.postMessage`. Il browser blocca la comunicazione perché `Cross-Origin-Opener-Policy` è impostato a `same-origin` (o simile) da Cloudflare/Render.

**Errore in console:**

```
Cross-Origin-Opener-Policy policy would block the window.postMessage call.
```

## Causa

Cloudflare Pages imposta di default `Cross-Origin-Opener-Policy: same-origin` per sicurezza. Questo impedisce a popup di origini diverse (Google) di comunicare con la finestra padre via `postMessage`.

## Fix

Aggiungere un header HTTP custom su Cloudflare Pages:

```
Header name: Cross-Origin-Opener-Policy
Value: unsafe-none
Apply to: /* (tutte le route)
```

## Dove si configura

1. Vai su [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Seleziona il tuo account
3. Vai a **Pages** → **pdfeditor.mirkobechini.com**
4. Vai a **Settings** → **Headers**
5. Aggiungi un custom header:
   - **Type:** Header
   - **Header name:** `Cross-Origin-Opener-Policy`
   - **Value:** `unsafe-none`
   - **Apply to:** `/*`

## Sicurezza

`unsafe-none` è l'equivalente di **non avere COOP**. È l'impostazione standard per siti web che usano popup di terze parti (Google OAuth, Stripe, PayPal, ecc.). Non riduce la sicurezza rispetto a qualsiasi sito che non imposta COOP.

Altri header di sicurezza (CSP, X-Frame-Options, HSTS) rimangono attivi e continuano a proteggere il sito.

## Verifica

Dopo il fix:

1. Apri la console del browser
2. Fai login con Google
3. Verifica che NON compaia più l'errore `Cross-Origin-Opener-Policy policy would block the window.postMessage call`
4. Verifica che `POST /auth/google` torni 200 (non 401)

## Status

[ ] Non iniziata
