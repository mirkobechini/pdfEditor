# Feature Plan: License Tier Button Skin — Indicatore Feature Bloccate

**Status:** Planning
**Priority:** Low (attivabile solo dopo Stripe/abbonamenti)
**Complexity:** Low
**Estimated Time:** 1 giorno

---

## Objective

Creare un sistema visivo (skin/theme) per i pulsanti della toolbar che indichi chiaramente all'utente quali feature **non sono disponibili** con il suo tier di licenza corrente, incoraggiando l'upgrade.

## Contesto

Attualmente il backend blocca le operazioni non consentite via `verify_feature_access()` (403 Forbidden), ma il frontend **non dà alcun feedback visivo preventivo**. L'utente clicca un pulsante, l'operazione fallisce, e vede un errore — esperienza frustrante.

Quando gli abbonamenti Stripe saranno attivi, serve un sistema che:

1. Mostri i pulsanti delle feature bloccate con un aspetto "disabilitato" (grigio, lucchetto, badge "Premium")
2. Al click/hover, mostri un tooltip: "Upgrade to Premium to unlock this feature"
3. Porti l'utente alla pagina di billing/upgrade

**Importante**: questa skin si attiverà solo quando `DISABLE_LICENSE_ENFORCEMENT=False` (cioè quando gli abbonamenti saranno attivi). Per ora il flag è `True` (tutto aperto).

## Design

### Pulsante feature bloccata

```
┌─────────────────────────┐
│ 🔒 Merge PDF    ⭐ PRO  │  ← badge "PRO" sull'angolo
│   [grigio/opaco]        │  ← colore desaturato
└─────────────────────────┘
```

### Pulsante feature disponibile

```
┌─────────────────────────┐
│ 📄 Merge PDF            │  ← colore normale
│   [blu/arancione]       │
└─────────────────────────┘
```

### Tooltip al hover/click

```
┌──────────────────────────────────┐
│ 🔒 This feature requires        │
│    Premium or higher tier.      │
│                                  │
│    [Upgrade to Premium →]       │
└──────────────────────────────────┘
```

## Implementazione

### 1. Backend: endpoint per feature disponibili

```python
# GET /auth/me/features
# Restituisce la lista delle feature disponibili per il tier corrente
{
  "tier": "free",
  "features": ["upload_pdf", "download_pdf", "extract_text"]
}
```

### 2. Frontend: hook `useFeatureAccess`

```tsx
// useFeatureAccess.ts
function useFeatureAccess() {
  const { user } = useAuth();
  const [features, setFeatures] = useState<string[]>([]);

  useEffect(() => {
    api.getMyFeatures().then(setFeatures);
  }, [user]);

  const canAccess = (feature: string) => features.includes(feature);
  return { canAccess, features, tier: user?.license_tier };
}
```

### 3. Frontend: componente `FeatureButton`

```tsx
interface FeatureButtonProps {
  feature: string; // es. "merge_pdf"
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}

function FeatureButton({ feature, onClick, icon, label }: FeatureButtonProps) {
  const { canAccess, tier } = useFeatureAccess();
  const locked = !canAccess(feature);

  return (
    <div className="relative group">
      <button
        onClick={locked ? undefined : onClick}
        className={clsx(
          "px-3 py-1 text-xs rounded transition-all",
          locked
            ? "bg-gray-300 text-gray-500 cursor-not-allowed opacity-60"
            : "bg-blue-500 text-white hover:bg-blue-600",
        )}
      >
        {locked && "🔒 "}
        {icon} {label}
        {locked && tier === "free" && (
          <span className="ml-1 px-1 py-0.5 text-[10px] bg-amber-500 text-white rounded">
            PRO
          </span>
        )}
      </button>

      {locked && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
            <p>🔒 This feature requires Premium</p>
            <Link
              href="/app/billing"
              className="text-amber-400 hover:underline"
            >
              Upgrade →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 4. Refactoring Toolbar

Sostituire i pulsanti statici nella `Toolbar.tsx` con `FeatureButton`:

```tsx
<FeatureButton feature="merge_pdf" onClick={onMerge} icon="📄" label={t("merge")} />
<FeatureButton feature="split_pdf" onClick={onSplit} icon="✂️" label={t("split")} />
<FeatureButton feature="reorder_pages" onClick={onReorder} icon="↕️" label={t("reorder")} />
// ...etc
```

## Dipendenze

- `DISABLE_LICENSE_ENFORCEMENT=False` (da attivare quando Stripe è pronto)
- Endpoint `GET /auth/me/features` (backend)
- `useFeatureAccess` hook (frontend)
- `FeatureButton` componente (frontend)
- Pagina `/app/billing` (da feature Stripe MCP)

## Output atteso

- Pulsanti feature bloccate visivamente distinti (grigi, opachi, badge PRO)
- Tooltip al hover con messaggio e link upgrade
- Nessun cambiamento visivo quando `DISABLE_LICENSE_ENFORCEMENT=True`
- Compatibile con dark mode
- Test per `FeatureButton` e `useFeatureAccess`

## Status

[ ] Non iniziata
