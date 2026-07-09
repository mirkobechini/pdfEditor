# Feature Plan: Landing Page Footer Fix — Link Funzionali

**Status:** Planning
**Priority:** Low
**Complexity:** Low
**Estimated Time:** 1-2 ore

---

## Objective

Rendere funzionali i link nel footer della landing page, assicurando che puntino alle sezioni/pagine corrette. Aggiungere un link nascosto (non visibile nel footer principale) che porti al sito personale futuro.

## Problema attuale

I link nel footer della landing page (`LandingFooter.tsx`) potrebbero essere placeholder o non puntare a destinazioni reali. I footer tipicamente contengono:

- Link a sezioni della landing (Features, How it Works, Pricing)
- Link legali (Privacy Policy, Terms of Service)
- Link social
- Copyright

## Soluzione

### 1. Verifica e fix link esistenti

Controllare `LandingFooter.tsx` e assicurarsi che:

- `#features` → scrolla alla sezione Features
- `#how-it-works` → scrolla alla sezione How It Works
- `#pricing` → scrolla alla sezione Pricing
- Link a `/login` e `/register` funzionanti
- Link a `/privacy` e `/terms` (pagine da creare con placeholder)

### 2. Aggiungere link nascosto al sito personale

Aggiungere un link nel footer che:

- **Non è visibile** nel rendering normale (nascosto via CSS o commento HTML)
- Punta al dominio del sito futuro (es. `https://mirkobechini.dev` o quello che sceglierai)
- Serve come "easter egg" o link per SEO futuro
- Implementazione: commento HTML o elemento con classe `hidden`/`sr-only`

```tsx
{
  /* Hidden link to personal site — activate when ready */
}
<a href="https://TUO-DOMINIO-FUTURO.dev" className="hidden" rel="me author">
  Mirko Bechini
</a>;
```

### 3. Aggiungere chiavi i18n mancanti

Se il footer ha testi hardcodati, aggiungere chiavi in `en.json` e `it.json`:

- `landing.footer.privacy`
- `landing.footer.terms`
- `landing.footer.rights`

## Dipendenze

- `frontend/src/app/components/landing/LandingFooter.tsx`
- `frontend/messages/en.json` e `it.json`
- Eventuali nuove pagine: `/privacy`, `/terms`

## Output atteso

- Tutti i link del footer puntano a destinazioni reali
- Link nascosto al sito personale presente nel DOM ma non visibile
- Testi footer tradotti EN/IT
- Sezioni landing correttamente linkate con anchor scroll

## Status

[ ] Non iniziata
