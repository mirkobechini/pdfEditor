# Feature Plan: User Bug Report Status in Dashboard

**Status:** Planning
**Priority:** MEDIA (UX Improvement)
**Complexity:** Low
**Estimated Time:** 2-3 hours

---

## Obiettivo

Aggiungere nella dashboard utente (`/app/profile`) una sezione che mostra lo stato delle segnalazioni bug fatte dall'utente.

## Contesto

Attualmente:

- L'utente può segnalare bug tramite `BugReportDialog`
- L'admin può vedere e gestire i bug nella dashboard admin
- L'utente **non ha visibilità** sullo stato delle proprie segnalazioni

## Soluzione

### Backend

#### 1. Endpoint: `GET /bugs/my`

```python
# backend/app/api/v1/bug_report.py
@router.get("/bugs/my", response_model=list[BugReportResponse])
def get_my_bug_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[BugReportResponse]:
    """Get bug reports submitted by the current user."""
    repo = BugReportRepository(db)
    bugs = repo.get_by_user_id(current_user.id)
    return [BugReportResponse.model_validate(b) for b in bugs]
```

#### 2. Repository method

```python
# backend/app/repositories/bug_report_repo.py
def get_by_user_id(self, user_id: str) -> list[BugReport]:
    return (
        self.db.query(BugReport)
        .filter(BugReport.user_id == user_id)
        .order_by(BugReport.created_at.desc())
        .all()
    )
```

### Frontend

#### 1. API Client

```typescript
// frontend/src/app/lib/api.ts
async listMyBugReports(): Promise<BugReport[]> {
  const res = await fetch(`${this.baseUrl}/bugs/my`);
  if (!res.ok) throw new Error(await ApiClient.extractError(res));
  return res.json();
}
```

#### 2. Profile Page — Sezione Bug Reports

```tsx
// frontend/src/app/app/profile/page.tsx
<section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
  <h2 className="text-xl font-bold mb-4">{t("myBugReports")}</h2>

  {bugs.length === 0 ? (
    <p className="text-sm text-gray-400">{t("noBugs")}</p>
  ) : (
    <div className="space-y-3">
      {bugs.map((bug) => (
        <div key={bug.id} className="border rounded p-3">
          <div className="flex justify-between items-start">
            <h3 className="font-medium text-sm">{bug.title}</h3>
            <StatusBadge status={bug.status} />
          </div>
          <p className="text-xs text-gray-500 mt-1">{bug.description}</p>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(bug.created_at).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  )}
</section>
```

#### 3. StatusBadge Component

```tsx
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: "bg-red-100 text-red-700",
    in_progress: "bg-yellow-100 text-yellow-700",
    resolved: "bg-green-100 text-green-700",
    closed: "bg-gray-100 text-gray-700",
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded font-medium ${colors[status] || "bg-gray-100"}`}
    >
      {status}
    </span>
  );
}
```

### Translation Keys

```json
// frontend/messages/en.json
"profile": {
  ...
  "myBugReports": "My Bug Reports",
  "noBugs": "No bug reports submitted"
}

// frontend/messages/it.json
"profile": {
  ...
  "myBugReports": "Le Mie Segnalazioni",
  "noBugs": "Nessuna segnalazione inviata"
}
```

## Files da modificare

**Backend:**

- `backend/app/api/v1/bug_report.py` — Aggiungere `GET /bugs/my`
- `backend/app/repositories/bug_report_repo.py` — Aggiungere `get_by_user_id()`

**Frontend:**

- `frontend/src/app/lib/api.ts` — Aggiungere `listMyBugReports()`
- `frontend/src/app/app/profile/page.tsx` — Aggiungere sezione bug
- `frontend/messages/en.json` — Aggiungere chiavi
- `frontend/messages/it.json` — Aggiungere chiavi

## Acceptance Criteria

- [ ] Utente vede i propri bug report nella dashboard
- [ ] Ogni bug mostra titolo, descrizione, data e stato
- [ ] Stato con badge colorato (open/in_progress/resolved/closed)
- [ ] Se nessun bug, mostra messaggio vuoto
- [ ] Traduzioni EN/IT funzionanti
