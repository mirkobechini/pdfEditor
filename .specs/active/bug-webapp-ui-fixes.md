# Bug: Fix vari UI webapp

**Status:** Non iniziata
**Priority:** MEDIA

## Issue

### W1 — Google logo nel profilo

Sostituire emoji 🔵 con SVG del logo Google colorato nella sezione "Connected Services" del profilo.

### W3 — Admin descrizione troncata

Rimuovere `max-w-xs truncate` dalla colonna description in admin bug report table. Aggiungere expand-on-click o modal per vedere tutto il testo.

### W4 — Admin back navigazione flash

Quando si torna indietro da admin (`/admin` → anywhere), mostra brevemente la landing page prima di redirect a `/app`. Causa: auth state loading.

### W7 — Logo scimmia assente

A volte l'immagine `/orange-monkey_logo.png` non si carica e mostra solo "P". Aggiungere `onError` handler per mostrare icona placeholder.

### W8 — Google button centrato

Il button Google SSO non è centrato dopo login. Fix CSS.

## File coinvolti

- `frontend/src/app/app/profile/page.tsx`
- `frontend/src/app/admin/page.tsx`
- `frontend/src/app/components/GoogleLoginButton.tsx`
- `frontend/src/app/components/landing/LandingNavbar.tsx`
- Vari componenti con Image component
