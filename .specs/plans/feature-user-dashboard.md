# Feature Plan: User Dashboard (Profilo Utente)

**Status:** Planning  
**Priority:** High  
**Complexity:** Medium  
**Estimated Time:** 2-3 days

---

## Objective

Creare una pagina `/app/profile` dove l'utente può:

1. Visualizzare e modificare il proprio nome
2. Visualizzare il proprio abbonamento (tier di licenza)
3. Gestire account collegati (Google OAuth)
4. Visualizzare impostazioni account (email, created_at, ecc.)
5. (Futuro) Cambiare password
6. (Futuro) Impostazioni privacy/notifiche

---

## Backend Changes

### 1. User Model Update

Aggiungere campi se non presenti:

```python
# backend/app/models/user.py
class User(Base):
    ...
    full_name: Mapped[str]
    license_tier: Mapped[str] = mapped_column(String(50), default="free")
    google_id: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True)
    google_linked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

### 2. New Endpoint: `PUT /auth/me`

Permettere all'utente di aggiornare il proprio profilo:

```python
# backend/app/api/v1/auth.py
@router.put("/me", response_model=UserResponse)
def update_profile(
    req: UserUpdateRequest,  # full_name (optional)
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> UserResponse:
    """Update current user profile."""
    service = AuthService(db)
    user = service.get_current_user(credentials.credentials)

    if req.full_name:
        user.full_name = req.full_name
        service.repo.update(user)

    return UserResponse.model_validate(user)
```

### 3. Update UserResponse Schema

```python
# backend/app/schemas/auth.py
class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    license_tier: str
    is_active: bool
    is_admin: bool
    google_id: str | None
    google_linked_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
```

### 4. Request Schema

```python
class UserUpdateRequest(BaseModel):
    full_name: str | None = Field(None, min_length=1, max_length=255)
```

---

## Frontend Changes

### 1. Create Profile Page

```tsx
// frontend/src/app/app/profile/page.tsx
"use client";

import { useAuthContext } from "@/app/components/AuthContext";
import { useTranslations } from "next-intl";
import { api } from "@/app/lib/api";
import React from "react";

export default function ProfilePage() {
  const t = useTranslations("profile");
  const { user, setUser } = useAuthContext();
  const [editName, setEditName] = React.useState(user?.full_name || "");
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    setLoading(true);
    try {
      const updated = await api.put("/auth/me", { full_name: editName });
      setUser(updated);
      setMessage(t("saved"));
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage(t("error"));
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div>{t("loading")}</div>;

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold">{t("title")}</h1>

      {/* Personal Info */}
      <section className="border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">{t("personalInfo")}</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("email")}
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-3 py-2 border rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {t("fullName")}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 px-3 py-2 border rounded dark:bg-gray-700"
              />
              <button
                onClick={handleSaveName}
                disabled={loading || editName === user.full_name}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? t("saving") : t("save")}
              </button>
            </div>
          </div>

          {message && (
            <div className="p-2 text-sm text-green-600 bg-green-100 rounded">
              {message}
            </div>
          )}
        </div>
      </section>

      {/* Account Info */}
      <section className="border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">{t("accountInfo")}</h2>

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="font-medium">{t("licenseTier")}:</dt>
            <dd className="text-blue-600">{user.license_tier.toUpperCase()}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="font-medium">{t("joinedDate")}:</dt>
            <dd>{new Date(user.created_at).toLocaleDateString()}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="font-medium">{t("status")}:</dt>
            <dd>{user.is_active ? t("active") : t("inactive")}</dd>
          </div>
        </dl>
      </section>

      {/* Linked Accounts */}
      <section className="border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">{t("linkedAccounts")}</h2>

        {user.google_linked_at ? (
          <p className="text-green-600">{t("googleLinked")}</p>
        ) : (
          <div>
            <p className="mb-4">{t("googleNotLinked")}</p>
            {/* GoogleLoginButton with onSuccess handler for linking */}
          </div>
        )}
      </section>
    </div>
  );
}
```

### 2. Update API Client

```typescript
// frontend/src/app/lib/api.ts
export const api = {
  // ... existing methods

  put: async (path: string, data?: any) => {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await getToken()}`,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    return handleResponse(response);
  },
};
```

### 3. Add Profile Link to Header

```tsx
// In HeaderControls.tsx or app header
<a href="/app/profile" className="text-sm text-blue-500 hover:underline">
  {user?.full_name} ⚙️
</a>
```

### 4. Translation Keys

```json
// frontend/messages/en.json
{
  "profile": {
    "title": "Profile Settings",
    "loading": "Loading...",
    "personalInfo": "Personal Information",
    "email": "Email",
    "fullName": "Full Name",
    "save": "Save",
    "saving": "Saving...",
    "saved": "Profile updated!",
    "error": "Failed to save profile",
    "accountInfo": "Account Information",
    "licenseTier": "License Tier",
    "joinedDate": "Joined Date",
    "status": "Account Status",
    "active": "Active",
    "inactive": "Inactive",
    "linkedAccounts": "Linked Accounts",
    "googleLinked": "✅ Google account linked",
    "googleNotLinked": "No Google account linked",
    "linkGoogle": "Link Google Account"
  }
}

// frontend/messages/it.json
{
  "profile": {
    "title": "Impostazioni Profilo",
    "loading": "Caricamento...",
    "personalInfo": "Informazioni Personali",
    "email": "Email",
    "fullName": "Nome Completo",
    "save": "Salva",
    "saving": "Salvataggio...",
    "saved": "Profilo aggiornato!",
    "error": "Errore nel salvataggio",
    "accountInfo": "Informazioni Account",
    "licenseTier": "Tipo Licenza",
    "joinedDate": "Data di Iscrizione",
    "status": "Stato Account",
    "active": "Attivo",
    "inactive": "Inattivo",
    "linkedAccounts": "Account Collegati",
    "googleLinked": "✅ Account Google collegato",
    "googleNotLinked": "Nessun account Google collegato",
    "linkGoogle": "Collega Account Google"
  }
}
```

---

## Implementation Steps

### Phase 1: Backend (1 day)

- [ ] Verify User model has all fields (full_name, license_tier, google_id, google_linked_at, created_at)
- [ ] Implement `PUT /auth/me` endpoint
- [ ] Update UserResponse schema
- [ ] Write backend tests for update endpoint

### Phase 2: Frontend (1 day)

- [ ] Create profile page
- [ ] Implement form for editing name
- [ ] Add API client `put()` method
- [ ] Add profile link to header
- [ ] Add translation keys

### Phase 3: Integ & QA (0.5 day)

- [ ] E2E test profile update
- [ ] Test responsive design
- [ ] Verify i18n on profile page
- [ ] Test Google account linking section (if implemented)

---

## Future Enhancements

- [ ] Change password endpoint
- [ ] Delete account
- [ ] Privacy settings
- [ ] Email notifications preferences
- [ ] Two-factor authentication

---

## Security Considerations

1. **Only authenticated users** can access `/app/profile`
2. **Users can only modify own profile** (not other users')
3. **Email cannot be changed** (immutable identifier)
4. **Rate limit** `PUT /auth/me` to prevent abuse

---

## References

- User model: [backend/app/models/user.py](backend/app/models/user.py)
- Auth schemas: [backend/app/schemas/auth.py](backend/app/schemas/auth.py)
- Auth router: [backend/app/api/v1/auth.py](backend/app/api/v1/auth.py)
