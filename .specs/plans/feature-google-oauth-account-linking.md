# Feature Plan: Google OAuth Account Linking

**Status:** ✅ Completata (2026-07-10)
**Priority:** Medium (Fase 1.5)
**Complexity:** High
**Estimated Time:** 2-3 days

---

## Objective

Allow users to:

1. **Login initially with email/password** (standard auth)
2. **Later link their Google account** to the same User record
3. **Switch between login methods** without creating duplicate accounts

This prevents the current issue where `google_login()` creates a new User if the email doesn't exist, potentially creating orphaned accounts.

---

## Background

### Current State

The current implementation (`backend/app/services/auth_service.py`) has two separate login flows:

```python
def login(self, email: str, password: str) -> str
def google_login(self, id_token: str) -> tuple[User, str]
```

**Problem:**

- User registers with `email@gmail.com` + password → User record created
- Later, user tries Google SSO with same `email@gmail.com` → New User created (wrong!)
- Two separate accounts exist for the same person

### Solution Architecture

1. **User model update**: Add `google_id` (optional, nullable) field
2. **New endpoint**: `POST /auth/link-google` — link Google account to logged-in user
3. **Update `google_login()`**: Check for existing email → if exists + not already linked, propose linking instead of creating new
4. **Frontend**: Add "Link Google account" button in settings/profile page
5. **Conflict resolution**: If user tries Google SSO with unlinked email, show UI suggesting login first

---

## Database Changes

### Migration (Alembic)

Add column to `user` table:

```python
# backend/alembic/versions/XXXX_add_google_id_to_user.py
def upgrade():
    op.add_column('user', sa.Column('google_id', sa.String(255), nullable=True, unique=True, index=True))
    op.add_column('user', sa.Column('google_linked_at', sa.DateTime, nullable=True))

def downgrade():
    op.drop_column('user', 'google_linked_at')
    op.drop_index(op.f('ix_user_google_id'), table_name='user')
    op.drop_column('user', 'google_id')
```

### Model Changes

```python
# backend/app/models/user.py
class User(Base):
    ...
    google_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    google_linked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
```

---

## Backend Implementation

### 1. Update `auth_service.py`

#### a) New method: `link_google_account()`

```python
def link_google_account(self, user_id: str, id_token: str) -> User:
    """Link a Google account to an existing logged-in user."""
    # Validate id_token → extract google_id
    payload = self._verify_google_token(id_token)
    google_id = payload.get('sub')

    if not google_id:
        raise ValueError("Invalid Google token: missing sub")

    user = self.repo.get_by_id(user_id)
    if not user:
        raise ValueError("User not found")

    # Check if this google_id is already linked to another user
    existing = self.repo.get_by_google_id(google_id)
    if existing and existing.id != user_id:
        raise ValueError("Google account already linked to another user")

    # Link it
    user.google_id = google_id
    user.google_linked_at = datetime.now(timezone.utc)
    self.repo.update(user)
    return user
```

#### b) Update `google_login()`

```python
def google_login(self, id_token: str) -> tuple[User, str]:
    """Login with Google. If email exists but not linked, suggest linking."""
    payload = self._verify_google_token(id_token)
    email = payload.get('email')
    google_id = payload.get('sub')

    if not email or not google_id:
        raise ValueError("Google token missing email or sub")

    # Check by google_id first (direct link)
    user = self.repo.get_by_google_id(google_id)
    if user:
        if not user.is_active:
            raise ValueError("Account is inactive")
        token = create_access_token(data={"sub": user.id})
        return user, token

    # Check by email (may be registered but not linked)
    user = self.repo.get_by_email(email)
    if user:
        # User exists but not linked to Google
        # Don't auto-create, raise error asking user to link
        raise ValueError(
            "Email already registered. "
            "Please login with password first, then link your Google account."
        )

    # Create new user (first-time Google login)
    name = payload.get('name', email.split('@')[0])
    random_pw = secrets.token_urlsafe(32)
    hashed = get_password_hash(random_pw)
    user = User(
        email=email,
        hashed_password=hashed,
        full_name=name,
        google_id=google_id,
        google_linked_at=datetime.now(timezone.utc),
    )
    user = self.repo.create(user)
    token = create_access_token(data={"sub": user.id})
    return user, token
```

### 2. Update `user_repo.py`

```python
def get_by_google_id(self, google_id: str) -> User | None:
    return self.db.query(User).filter(User.google_id == google_id).first()
```

### 3. New endpoint: `POST /auth/link-google`

```python
# backend/app/api/v1/auth.py
@router.post("/link-google", response_model=UserResponse)
def link_google(
    req: GoogleLoginRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    service: AuthService = Depends(get_auth_service),
) -> UserResponse:
    """Link a Google account to the currently logged-in user."""
    try:
        # Get current user from JWT
        auth_service = AuthService(service.repo.db)
        user = auth_service.get_current_user(credentials.credentials)

        # Link Google account
        updated_user = service.link_google_account(user.id, req.id_token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return UserResponse.model_validate(updated_user)
```

---

## Frontend Implementation

### 1. Settings/Profile Page (New)

Create `frontend/src/app/app/settings/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/app/lib/api";
import { useAuthContext } from "@/app/components/AuthContext";
import GoogleLoginButton from "@/app/components/GoogleLoginButton";

export default function SettingsPage() {
  const t = useTranslations();
  const { user } = useAuthContext();
  const [isLinked, setIsLinked] = useState(false);

  useEffect(() => {
    if (user?.google_linked_at) {
      setIsLinked(true);
    }
  }, [user]);

  const handleLinkGoogle = async (id_token: string) => {
    try {
      await api.post("/auth/link-google", { id_token });
      setIsLinked(true);
      alert(t("settings.googleLinked"));
    } catch (error) {
      console.error("Link failed:", error);
      alert(t("settings.linkFailed"));
    }
  };

  return (
    <div className="p-6">
      <h1>{t("settings.title")}</h1>

      <section className="mt-8 p-4 border rounded">
        <h2>{t("settings.linkedAccounts")}</h2>

        {isLinked ? (
          <p className="text-green-600">{t("settings.googleLinkedSuccess")}</p>
        ) : (
          <div>
            <p>{t("settings.googleNotLinked")}</p>
            <GoogleLoginButton
              onSuccess={handleLinkGoogle}
              text={t("settings.linkGoogle")}
            />
          </div>
        )}
      </section>
    </div>
  );
}
```

### 2. Update `GoogleLoginButton` Component

Modify `frontend/src/app/components/GoogleLoginButton.tsx` to support custom callbacks:

```tsx
interface GoogleLoginButtonProps {
  onSuccess: (id_token: string) => void;
  onError?: (error: ICredentialResponse | null) => void;
  text?: string;
}

export default function GoogleLoginButton({
  onSuccess,
  onError,
  text,
}: GoogleLoginButtonProps) {
  return (
    <GoogleLogin
      onSuccess={(credentialResponse) => {
        if (credentialResponse.credential) {
          onSuccess(credentialResponse.credential);
        }
      }}
      onError={() => onError?.(null)}
    />
  );
}
```

### 3. Update Translation Keys

Add to `frontend/messages/en.json`:

```json
{
  "settings": {
    "title": "Settings",
    "linkedAccounts": "Linked Accounts",
    "googleNotLinked": "Google account not linked",
    "googleLinkedSuccess": "Google account successfully linked!",
    "linkFailed": "Failed to link Google account",
    "linkGoogle": "Link Google Account"
  }
}
```

Add to `frontend/messages/it.json`:

```json
{
  "settings": {
    "title": "Impostazioni",
    "linkedAccounts": "Account Collegati",
    "googleNotLinked": "Account Google non collegato",
    "googleLinkedSuccess": "Account Google collegato con successo!",
    "linkFailed": "Errore nel collegamento dell'account Google",
    "linkGoogle": "Collega Account Google"
  }
}
```

### 4. Update Login Flow (Error Handling)

In `frontend/src/app/login/page.tsx`, handle the new error response:

```tsx
const handleGoogleSuccess = async (id_token: string) => {
  try {
    const response = await api.post("/auth/google", { id_token });
    // ... success
  } catch (error: any) {
    if (error?.message?.includes("already registered")) {
      setErrorMessage(t("login.emailAlreadyRegistered_linkInSettings"));
      // Suggest user to login with password first
    } else {
      setErrorMessage(error?.message || t("login.unknownError"));
    }
  }
};
```

---

## Testing Strategy

### Backend Unit Tests

```python
# backend/tests/test_auth.py - add to existing test file

def test_link_google_account_success(db):
    """Link Google account to existing user."""
    user = create_test_user(db, email="test@example.com")
    service = AuthService(db)

    # Mock Google token
    with patch('...._verify_google_token') as mock:
        mock.return_value = {'sub': 'google_123', 'email': 'test@example.com'}
        updated_user = service.link_google_account(user.id, "fake_token")

    assert updated_user.google_id == 'google_123'
    assert updated_user.google_linked_at is not None

def test_google_login_with_existing_email_raises_error(db):
    """Google login with already-registered email raises error."""
    create_test_user(db, email="existing@example.com")
    service = AuthService(db)

    with patch('...._verify_google_token') as mock:
        mock.return_value = {'sub': 'google_456', 'email': 'existing@example.com'}
        with pytest.raises(ValueError, match="already registered"):
            service.google_login("fake_token")

def test_google_login_first_time_creates_user(db):
    """Google login with new email creates user and links immediately."""
    service = AuthService(db)

    with patch('...._verify_google_token') as mock:
        mock.return_value = {'sub': 'google_789', 'email': 'newuser@gmail.com', 'name': 'New User'}
        user, token = service.google_login("fake_token")

    assert user.google_id == 'google_789'
    assert user.email == 'newuser@gmail.com'
```

### Frontend Tests

```tsx
// frontend/src/app/settings/__tests__/page.test.tsx

describe("SettingsPage", () => {
  it("displays linked status when google_linked_at set", () => {
    const mockUser = {
      ...defaultUser,
      google_linked_at: "2026-07-09T10:00:00Z",
    };
    render(<SettingsPage />);
    expect(screen.getByText(/successfully linked/i)).toBeInTheDocument();
  });

  it("shows link button when not linked", () => {
    const mockUser = { ...defaultUser, google_linked_at: null };
    render(<SettingsPage />);
    expect(screen.getByText(/link google/i)).toBeInTheDocument();
  });
});
```

### API Integration Tests

```bash
# Test flow
1. Register with email/password
2. Logout
3. Try Google login with same email → expect 400 error
4. Login with password
5. POST /auth/link-google with valid Google token → expect 200
6. Logout
7. Google login with same email → expect success (200)
```

---

## Implementation Steps

### Phase 1: Backend (Day 1)

- [ ] Create Alembic migration
- [ ] Update User model
- [ ] Update AuthService methods
- [ ] Update UserRepository
- [ ] Add new endpoint `/auth/link-google`
- [ ] Write backend unit tests
- [ ] Test manual flow

### Phase 2: Frontend (Day 1.5)

- [ ] Create Settings page
- [ ] Update GoogleLoginButton component
- [ ] Add translation keys (EN/IT)
- [ ] Update login error handling
- [ ] Add frontend tests

### Phase 3: Integration & QA (Day 2)

- [ ] E2E test full flow
- [ ] Error handling edge cases
- [ ] Security review (prevent account takeover)
- [ ] Performance testing (no N+1 queries)

### Phase 4: Documentation (Day 2.5)

- [ ] Update API docs
- [ ] Update user guide
- [ ] Update ADR.md

---

## Security Considerations

1. **Prevent Account Takeover**:
   - Verify Google ID token signature on server
   - Check `aud` (audience) matches `GOOGLE_CLIENT_ID`
   - Rate limit `/auth/link-google` endpoint

2. **Email Collision**:
   - If two users try to link the same Google email, second attempt fails
   - Error message is clear: "Email already linked to another account"

3. **CSRF Protection**:
   - Ensure JWT token is required for `/auth/link-google`
   - No state-changing operations without authentication

4. **Session Fixation**:
   - After successful link, invalidate old tokens
   - Issue new JWT to reflect updated user state

---

## Rollback Plan

If linking implementation causes issues:

1. Revert migration (Alembic downgrade)
2. Revert code changes
3. Keep `google_id` column in production (backward-compat) but don't use it
4. Alternative: soft delete via feature flag

---

## Future Enhancements

- [ ] Unlink Google account (reverse operation)
- [ ] Multiple Google accounts per User (if needed)
- [ ] SSO with other providers (GitHub, Microsoft)
- [ ] Account merge UI (if duplicate accounts detected)

---

## Approval Checklist

- [ ] Architecture reviewed
- [ ] Security approved
- [ ] Testing strategy signed off
- [ ] Performance impact assessed
- [ ] Timeline agreed

---

## References

- [Google OAuth Docs](https://developers.google.com/identity/protocols)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8949)
- [Account Linking Patterns](https://auth0.com/docs/get-started/authentication-and-authorization/account-linking)
