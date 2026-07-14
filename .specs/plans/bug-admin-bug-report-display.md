# Bug Fix Plan: Admin Bug Report Display — Missing Fields

**Status:** ✅ Completata (2026-07-11, PR #204)
**Priority:** MEDIA (Admin UX)
**Severity:** Low
**Complexity:** Low
**Estimated Time:** 1 hour

---

## Problem Statement

Nella dashboard admin, la tabella dei bug report mostra solo: title, user_id (troncato), status, created_at, description, actions.

**Mancano:** `platform`, `app_version`, `os_info` — campi che vengono inviati dal frontend e salvati correttamente nel backend, ma non visualizzati nell'admin panel.

**Osservato in:**

- `frontend/src/app/admin/page.tsx` — `BugReportsTable` component

**Impatto:**

- Admin non vede informazioni utili per diagnosticare bug (piattaforma, versione app, OS)
- Deve aprire il DB per vedere questi dati

---

## Solution

Aggiungere colonne `platform`, `app_version`, `os_info` alla tabella bug report nell'admin dashboard.

### Frontend

```tsx
// frontend/src/app/admin/page.tsx — inside BugReportsTable
<thead>
  <tr className="border-b dark:border-gray-700 text-left">
    <th className="p-2 font-medium">{t("titleField")}</th>
    <th className="p-2 font-medium">{t("userId")}</th>
    <th className="p-2 font-medium">{t("platform")}</th>
    <th className="p-2 font-medium">{t("appVersion")}</th>
    <th className="p-2 font-medium">{t("osInfo")}</th>
    <th className="p-2 font-medium">{t("status")}</th>
    <th className="p-2 font-medium">{t("createdAt")}</th>
    <th className="p-2 font-medium">{t("description")}</th>
    <th className="p-2 font-medium">{t("actions")}</th>
  </tr>
</thead>
<tbody>
  {bugs.map((b) => (
    <tr key={b.id}>
      <td className="p-2 font-medium">{b.title}</td>
      <td className="p-2 text-gray-500 text-xs">{b.user_id.slice(0, 8)}...</td>
      <td className="p-2 text-xs">{b.platform || "-"}</td>
      <td className="p-2 text-xs">{b.app_version || "-"}</td>
      <td className="p-2 text-xs">{b.os_info || "-"}</td>
      ...
    </tr>
  ))}
</tbody>
```

### Translation Keys

```json
// frontend/messages/en.json
"admin": {
  ...
  "platform": "Platform",
  "appVersion": "App Version",
  "osInfo": "OS Info"
}

// frontend/messages/it.json
"admin": {
  ...
  "platform": "Piattaforma",
  "appVersion": "Versione App",
  "osInfo": "Info OS"
}
```

---

## Files to Modify

**Frontend:**

- `frontend/src/app/admin/page.tsx` — Add columns to BugReportsTable
- `frontend/messages/en.json` — Add translation keys
- `frontend/messages/it.json` — Add translation keys

---

## Acceptance Criteria

- [ ] Bug report table shows platform, app_version, os_info columns
- [ ] Missing values show "-" instead of blank
- [ ] Translations work for EN and IT
- [ ] Table remains responsive (use text-xs for new columns)
