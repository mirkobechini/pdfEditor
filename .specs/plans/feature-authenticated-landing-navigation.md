# Feature Plan: Navigazione Landing Page da App Autenticata

**Status:** Planning  
**Priority:** High  
**Complexity:** Low  
**Estimated Time:** 30 min

---

## Objective

Permettere all'utente autenticato di navigare dalla app (`/app`) back alla landing page (`/`), così da poter leggere info sul prodotto, features, ecc. senza dover fare logout.

---

## Current Issue

Attualmente, una volta loggati e navigati a `/app`, non c'è alcun link/bottone visibile per tornare alla landing page. L'utente deve:

- Fare logout
- Oppure modificare manualmente l'URL

Questo crea confusione UX.

---

## Solution

### Frontend Changes

#### 1. Aggiungi Link in Header

In `frontend/src/app/components/HeaderControls.tsx` o nel header principale dell'app, aggiungi un bottone "Home" o logo cliccabile che punta a `/`:

```tsx
// frontend/src/app/app/page.tsx (o layout)
<header className="flex items-center justify-between">
  <a href="/" className="text-xl font-bold text-blue-500 hover:underline">
    🏠 PdfEditor
  </a>
  <HeaderControls />
</header>
```

#### 2. Alternativa: Logo nella Sidebar

Aggiungi logo/link home nella sidebar PDF:

```tsx
<div className="flex items-center gap-2 mb-4 p-2">
  <a
    href="/"
    className="flex-1 text-center text-sm text-blue-500 hover:underline"
  >
    ← Torna alla Home
  </a>
</div>
```

#### 3. Traduzione i18n

Aggiungi chiavi:

```json
// frontend/messages/en.json
{
  "app": {
    "backToHome": "Back to Home",
    "backToLanding": "Back to Landing"
  }
}

// frontend/messages/it.json
{
  "app": {
    "backToHome": "Torna alla Home",
    "backToLanding": "Torna alla Landing"
  }
}
```

---

## Implementation Steps

1. [ ] Aggiungi link/bottone nel header dell'app
2. [ ] Test navigazione `/app` → `/`
3. [ ] Aggiungi chiavi i18n
4. [ ] Update frontend messages (en/it)
5. [ ] Test responsive (mobile, tablet, desktop)

---

## UI/UX Considerations

- **Placement**: Sinistra header (accanto logo) oppure nella sidebar
- **Style**: Bottone subtle (non primario) per non distogliere dal contenuto principale
- **Mobile**: Link deve essere sempre visibile e tocca-friendly
- **Accessibilità**: Aria-label chiaro

---

## Rollback

N/A — Change è completamente front-end e non-breaking.

---

## References

- Landing page: [frontend/src/app/landing/page.tsx](frontend/src/app/landing/page.tsx)
- App page: [frontend/src/app/app/page.tsx](frontend/src/app/app/page.tsx)
